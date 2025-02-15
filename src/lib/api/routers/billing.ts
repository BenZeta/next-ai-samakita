import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { PaymentStatus, PaymentType, TenantStatus, PaymentMethod } from "@prisma/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { sendPaymentReminder } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";
import { createPaymentIntent, retrievePaymentIntent, cancelPaymentIntent } from "@/lib/stripe";
import { sendInvoiceEmail } from "@/lib/email";

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
        amount: input.amount,
        type: input.type,
        method: input.method,
        status: PaymentStatus.PENDING,
        dueDate: input.dueDate,
        description: input.description,
        notes: input.notes,
        tenantId: input.tenantId,
        propertyId: tenant.room.propertyId,
      },
    });

    // If payment method is Stripe, create payment intent
    if (input.method === PaymentMethod.STRIPE) {
      try {
        const stripePayment = await createPaymentIntent({
          amount: payment.amount,
          customerEmail: tenant.email,
          customerName: tenant.name,
          orderId: payment.id,
          description: `${payment.type} payment for ${tenant.room.property.name} - Room ${tenant.room.number}`,
        });

        // Update payment with Stripe details
        await db.payment.update({
          where: { id: payment.id },
          data: {
            stripePaymentId: stripePayment.paymentIntentId,
            stripeClientSecret: stripePayment.clientSecret,
          },
        });

        // Return Stripe payment details
        return {
          ...payment,
          stripeClientSecret: stripePayment.clientSecret,
        };
      } catch (error) {
        console.error("Failed to create Stripe payment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Stripe payment",
        });
      }
    }

    // Send payment link to tenant
    if (payment.stripePaymentId) {
      const stripeStatus = await retrievePaymentIntent(payment.stripePaymentId);
      
      if (stripeStatus.status === "succeeded") {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        });
      }
    }

    return payment;
  }),

  getPayments: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        type: z.nativeEnum(PaymentType).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const payments = await ctx.db.payment.findMany({
        where: {
          tenantId: input.tenantId,
          type: input.type,
          createdAt: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        include: {
          tenant: {
            include: {
              room: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Check status of pending Stripe payments
      await Promise.all(
        payments.map(async (payment) => {
          if (
            payment.method === PaymentMethod.STRIPE &&
            payment.status === PaymentStatus.PENDING &&
            payment.stripePaymentId
          ) {
            try {
              const stripeStatus = await retrievePaymentIntent(payment.stripePaymentId);
              
              let newStatus: PaymentStatus = payment.status;
              let paidAt = payment.paidAt;

              switch (stripeStatus.status) {
                case "succeeded":
                  newStatus = PaymentStatus.PAID;
                  paidAt = new Date();
                  break;
                case "canceled":
                  newStatus = PaymentStatus.CANCELLED;
                  break;
                case "requires_payment_method":
                case "requires_confirmation":
                case "requires_action":
                  newStatus = PaymentStatus.PENDING;
                  break;
                default:
                  newStatus = PaymentStatus.FAILED;
              }

              if (newStatus !== payment.status) {
                await ctx.db.payment.update({
                  where: { id: payment.id },
                  data: {
                    status: newStatus,
                    paidAt,
                  },
                });
              }
            } catch (error) {
              console.error(`Failed to check Stripe payment status for payment ${payment.id}:`, error);
            }
          }
        })
      );

      return payments;
    }),

  updatePayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
        status: z.nativeEnum(PaymentStatus),
      })
    )
    .mutation(async ({ input, ctx }) => {
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

      // Prevent manual status changes for Stripe payments
      if (payment.method === PaymentMethod.STRIPE) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot manually update status of Stripe payments",
        });
      }

      // If cancelling payment, cancel any payment intents
      if (input.status === PaymentStatus.CANCELLED && payment.stripePaymentId) {
        await cancelPaymentIntent(payment.stripePaymentId);
      }

      return ctx.db.payment.update({
        where: { id: input.paymentId },
        data: {
          status: input.status,
          paidAt: input.status === PaymentStatus.PAID ? new Date() : null,
        },
      });
    }),

  checkPaymentStatus: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const payment = await ctx.db.payment.findUnique({
        where: { id: input.paymentId },
      });

      if (!payment || !payment.stripePaymentId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found or no Stripe ID associated",
        });
      }

      try {
        const stripeStatus = await retrievePaymentIntent(payment.stripePaymentId);
        
        let newStatus: PaymentStatus = payment.status;
        let paidAt = payment.paidAt;

        switch (stripeStatus.status) {
          case "succeeded":
            newStatus = PaymentStatus.PAID;
            paidAt = new Date();
            break;
          case "canceled":
            newStatus = PaymentStatus.CANCELLED;
            break;
          case "requires_payment_method":
          case "requires_confirmation":
          case "requires_action":
            newStatus = PaymentStatus.PENDING;
            break;
          default:
            newStatus = PaymentStatus.FAILED;
        }

        if (newStatus !== payment.status) {
          return ctx.db.payment.update({
            where: { id: payment.id },
            data: {
              status: newStatus,
              paidAt,
            },
          });
        }

        return payment;
      } catch (error) {
        console.error("Failed to check Stripe payment status:", error);
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
          // Generate Stripe payment link
          const stripePayment = await createPaymentIntent({
            amount: payment.amount,
            customerEmail: tenant.email,
            customerName: tenant.name,
            orderId: payment.id,
            description: `${payment.type} payment for ${tenant.room.property.name} - Room ${tenant.room.number}`,
          });

          // Update payment with Stripe details
          await ctx.db.payment.update({
            where: { id: payment.id },
            data: {
              stripePaymentId: stripePayment.paymentIntentId,
              stripeClientSecret: stripePayment.clientSecret,
            },
          });

          if (input.method === "whatsapp") {
            await sendPaymentReminder(tenant, {
              ...payment,
              stripeClientSecret: stripePayment.clientSecret,
            });
          } else {
            // Send email with proper formatting
            await sendInvoiceEmail({
              email: tenant.email,
              tenantName: tenant.name,
              propertyName: tenant.room.property.name,
              roomNumber: tenant.room.number,
              amount: payment.amount,
              dueDate: payment.dueDate,
              paymentLink: stripePayment.checkoutUrl || undefined,
              paymentType: payment.type,
              invoiceNumber: `INV-${payment.id}`,
            });
          }
        }

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send ${input.method} notification`,
        })
      }
    }),
});
