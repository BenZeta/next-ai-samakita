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
    const tenant = await db.tenant.findUnique({
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

    if (tenant.room.property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to create payments for this tenant",
      });
    }

    return db.payment.create({
      data: {
        ...input,
        propertyId: tenant.room.property.id,
        status: PaymentStatus.PENDING,
      },
    });
  }),

  getPayments: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        type: z.nativeEnum(PaymentType).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const payments = await ctx.db.payment.findMany({
        where: {
          tenantId: input.tenantId,
          type: input.type,
          dueDate: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        orderBy: {
          dueDate: "desc",
        },
        take: input.limit,
        include: {
          tenant: {
            include: {
              room: true,
            },
          },
          property: true,
        },
      });

      // Update payment statuses based on due dates and notifications
      const updatedPayments = await Promise.all(
        payments.map(async (payment) => {
          let newStatus = payment.status;

          // Don't update if already PAID or CANCELLED
          if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.CANCELLED) {
            if (payment.dueDate < now && !payment.paidAt) {
              newStatus = PaymentStatus.OVERDUE;
            } else if (payment.notificationSentAt && !payment.paidAt) {
              newStatus = PaymentStatus.PENDING;
            }

            // Update payment if status has changed
            if (newStatus !== payment.status) {
              await ctx.db.payment.update({
                where: { id: payment.id },
                data: { status: newStatus },
              });
              payment.status = newStatus;
            }

            // Check Midtrans status if payment is pending and has midtransId
            if (payment.midtransId && payment.status === PaymentStatus.PENDING) {
              const midtransStatus = await checkMidtransPaymentStatus(payment.midtransId);
              if (midtransStatus.transaction_status === "settlement") {
                await ctx.db.payment.update({
                  where: { id: payment.id },
                  data: { 
                    status: PaymentStatus.PAID,
                    paidAt: new Date(),
                  },
                });
                payment.status = PaymentStatus.PAID;
                payment.paidAt = new Date();
              }
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
      if (input.status === PaymentStatus.CANCELLED) {
        if (payment.midtransId) {
          await cancelMidtransPayment(payment.midtransId);
        }
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
