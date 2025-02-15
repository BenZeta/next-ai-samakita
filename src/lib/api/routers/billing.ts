import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { PaymentStatus, PaymentType, TenantStatus, PaymentMethod } from "@prisma/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { sendPaymentReminder } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";
import { createMidtransPayment, checkMidtransPaymentStatus, cancelMidtransPayment } from "@/lib/midtrans";

const paymentSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  amount: z.number().min(0, "Amount must be greater than or equal to 0"),
  type: z.nativeEnum(PaymentType),
  method: z.nativeEnum(PaymentMethod),
  dueDate: z.date(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export const billingRouter = createTRPCRouter({
  createPayment: protectedProcedure.input(paymentSchema).mutation(async ({ input, ctx }) => {
    const tenant = await ctx.db.tenant.findUnique({
      where: { id: input.tenantId },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    // Create payment record
    const payment = await ctx.db.payment.create({
      data: {
        ...input,
        status: PaymentStatus.PENDING,
        propertyId: tenant.room.propertyId,
      },
    });

    // If payment method is Midtrans, create payment in Midtrans
    if (input.method === PaymentMethod.MIDTRANS) {
      try {
        const midtransPayment = await createMidtransPayment({
          orderId: payment.id,
          amount: payment.amount,
          customerName: tenant.name,
          customerEmail: tenant.email,
        });

        // Update payment with Midtrans details
        await ctx.db.payment.update({
          where: { id: payment.id },
          data: {
            midtransId: midtransPayment.transaction_id,
            midtransToken: midtransPayment.token,
            method: PaymentMethod.MIDTRANS,
          },
        });

        return {
          ...payment,
          midtransRedirectUrl: midtransPayment.redirect_url,
        };
      } catch (error) {
        console.error("Failed to create Midtrans payment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Midtrans payment",
        });
      }
    }

    return payment;
  }),

  getPayments: protectedProcedure
    .input(
      z.object({
        tenantId: z.union([z.literal("all"), z.string()]),
        type: z.nativeEnum(PaymentType).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const payments = await ctx.db.payment.findMany({
        where: {
          ...(input.tenantId !== "all" ? { tenantId: input.tenantId } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.startDate && input.endDate
            ? {
                createdAt: {
                  gte: input.startDate,
                  lte: input.endDate,
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            include: {
              room: true
            }
          },
        },
      });

      // Check Midtrans status for pending payments
      const updatedPayments = await Promise.all(
        payments.map(async (payment) => {
          if (
            payment.method === PaymentMethod.MIDTRANS &&
            payment.status === PaymentStatus.PENDING &&
            payment.midtransId
          ) {
            try {
              const midtransStatus = await checkMidtransPaymentStatus(payment.midtransId);
              
              let newStatus: PaymentStatus = payment.status;
              let paidAt = payment.paidAt;

              switch (midtransStatus.transaction_status) {
                case "capture":
                case "settlement":
                  newStatus = PaymentStatus.PAID;
                  paidAt = new Date(midtransStatus.transaction_time);
                  break;
                case "deny":
                case "cancel":
                case "expire":
                  newStatus = PaymentStatus.CANCELLED;
                  break;
                case "failure":
                  newStatus = PaymentStatus.FAILED;
                  break;
              }

              if (newStatus !== payment.status) {
                await ctx.db.payment.update({
                  where: { id: payment.id },
                  data: {
                    status: newStatus,
                    paidAt,
                    midtransStatus: midtransStatus.transaction_status,
                  },
                });

                return {
                  ...payment,
                  status: newStatus,
                  paidAt,
                  midtransStatus: midtransStatus.transaction_status,
                };
              }
            } catch (error) {
              console.error(`Failed to check Midtrans status for payment ${payment.id}:`, error);
            }
          }
          return payment;
        })
      );

      return updatedPayments;
    }),

  updatePayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
        status: z.nativeEnum(PaymentStatus),
        proofOfPayment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findUnique({
        where: { id: input.paymentId },
        include: {
          tenant: true,
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      // If cancelling payment, invalidate any payment links
      if (input.status === PaymentStatus.CANCELLED && payment.midtransId) {
        await cancelMidtransPayment(payment.midtransId);
      }

      return ctx.db.payment.update({
        where: { id: input.paymentId },
        data: {
          status: input.status,
          paidAt: input.status === PaymentStatus.PAID ? new Date() : undefined,
          proofOfPayment: input.proofOfPayment,
          // Clear payment links if cancelled
          ...(input.status === PaymentStatus.CANCELLED
            ? {
                midtransId: null,
                midtransToken: null,
              }
            : {}),
        },
        include: {
          tenant: true,
        },
      });
    }),

  checkStatus: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findUnique({
        where: { id: input.paymentId },
      });

      if (!payment || !payment.midtransId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found or no Midtrans ID associated",
        });
      }

      try {
        const midtransStatus = await checkMidtransPaymentStatus(payment.midtransId);
        
        let newStatus: PaymentStatus = payment.status;
        let paidAt = payment.paidAt;

        switch (midtransStatus.transaction_status) {
          case "capture":
          case "settlement":
            newStatus = PaymentStatus.PAID;
            paidAt = new Date(midtransStatus.transaction_time);
            break;
          case "deny":
          case "cancel":
          case "expire":
            newStatus = PaymentStatus.CANCELLED;
            break;
          case "failure":
            newStatus = PaymentStatus.FAILED;
            break;
        }

        if (newStatus !== payment.status) {
          await ctx.db.payment.update({
            where: { id: payment.id },
            data: {
              status: newStatus,
              paidAt,
              midtransStatus: midtransStatus.transaction_status,
            },
          });
        }

        return {
          status: newStatus,
          midtransStatus: midtransStatus.transaction_status,
        };
      } catch (error) {
        console.error(`Failed to check Midtrans status for payment ${payment.id}:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check payment status",
        });
      }
    }),

  updateDeposit: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
        isRefunded: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findUnique({
        where: { id: input.paymentId },
        include: {
          tenant: true,
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      if (payment.type !== PaymentType.DEPOSIT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This payment is not a deposit",
        });
      }

      return ctx.db.payment.update({
        where: { id: input.paymentId },
        data: {
          isRefunded: input.isRefunded,
          status: input.isRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PAID,
        },
        include: {
          tenant: true,
        },
      });
    }),

  generateRent: protectedProcedure.mutation(async ({ ctx }) => {
    const activeTenants = await db.tenant.findMany({
      where: {
        status: TenantStatus.ACTIVE,
        room: {
          property: {
            userId: ctx.session.user.id,
          },
        },
      },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });

    const dueDate = new Date();
    dueDate.setDate(5); // Due on the 5th of next month
    if (dueDate.getDate() < 5) {
      dueDate.setMonth(dueDate.getMonth());
    } else {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    await Promise.all(
      activeTenants.map((tenant) =>
        db.payment.create({
          data: {
            tenantId: tenant.id,
            propertyId: tenant.room.property.id,
            amount: tenant.room.price,
            dueDate,
            type: PaymentType.RENT,
            status: PaymentStatus.PENDING,
          },
        })
      )
    );

    return { success: true };
  }),

  getStats: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["week", "month", "year"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const startDate = new Date();

      switch (input.timeRange) {
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const [totalRevenue, pendingPayments, dueThisWeek, overduePayments] = await Promise.all([
        ctx.db.payment
          .findMany({
            where: {
              status: PaymentStatus.PAID,
              paidAt: {
                gte: startDate,
                lte: now,
              },
            },
            select: {
              amount: true,
            },
          })
          .then((payments) => payments.reduce((sum, p) => sum + p.amount, 0)),
        ctx.db.payment.count({
          where: {
            status: PaymentStatus.PENDING,
          },
        }),
        ctx.db.payment.count({
          where: {
            status: PaymentStatus.PENDING,
            dueDate: {
              gte: now,
              lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        ctx.db.payment.count({
          where: {
            status: PaymentStatus.OVERDUE,
          },
        }),
      ]);

      return {
        totalRevenue,
        pendingPayments,
        dueThisWeek,
        overduePayments,
      };
    }),

  sendNotification: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        method: z.enum(["email", "whatsapp"]),
        paymentType: z.nativeEnum(PaymentType),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await ctx.db.tenant.findUnique({
        where: { id: input.tenantId },
        include: {
          payments: {
            where: {
              type: input.paymentType,
              status: {
                in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE],
              },
            },
          },
          room: {
            include: {
              property: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      if (tenant.payments.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No pending or overdue ${input.paymentType} payments found for this tenant`,
        });
      }

      try {
        for (const payment of tenant.payments) {
          // Generate Midtrans payment link
          const midtransPayment = await createMidtransPayment({
            orderId: payment.id,
            amount: payment.amount,
            customerName: tenant.name,
            customerEmail: tenant.email,
          });

          // Update payment with Midtrans details
          await ctx.db.payment.update({
            where: { id: payment.id },
            data: {
              midtransId: midtransPayment.transaction_id,
              midtransToken: midtransPayment.token,
              notificationSentAt: new Date(),
            },
          });

          if (input.method === "whatsapp") {
            await sendPaymentReminder(tenant, {
              ...payment,
              midtransRedirectUrl: midtransPayment.redirect_url,
            });
          } else {
            await sendEmail({
              to: tenant.email,
              subject: `${input.paymentType} Payment Reminder`,
              text: `Dear ${tenant.name},

This is a reminder for your ${input.paymentType.toLowerCase()} payment of Rp ${payment.amount.toLocaleString()}.

You can pay using one of these methods:

1. Midtrans Payment Link (Credit Card, Bank Transfer, E-Wallet):
${midtransPayment.redirect_url}

2. Manual Bank Transfer:
Bank: BCA
Account: 1234567890
Name: Property Owner Name

Please upload your proof of payment after making the transfer.

Best regards,
${tenant.room.property.name}`,
            });
          }
        }

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send ${input.method} notification`,
        });
      }
    }),
});
