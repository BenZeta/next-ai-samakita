import { db } from '@/lib/db';
import { sendInvoiceEmail } from '@/lib/email';
import {
  sendBillingEmail,
  sendBillingWhatsApp,
  sendPaymentReminderEmail,
  sendPaymentReminderWhatsApp,
} from '@/lib/notifications';
import { cancelPaymentIntent, createPaymentIntent, retrievePaymentIntent } from '@/lib/stripe';
import { sendPaymentReminder } from '@/lib/whatsapp';
import {
  BillingStatus,
  PaymentFrequency,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  Prisma,
  TenantStatus,
} from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { format } from 'date-fns';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const paymentSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  amount: z.number().min(0, 'Amount must be greater than or equal to 0'),
  type: z.nativeEnum(PaymentType),
  method: z.nativeEnum(PaymentMethod),
  dueDate: z.date(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const billingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  dueDate: z.date(),
  tenantId: z.string().optional(),
  type: z.nativeEnum(PaymentType),
});

const notificationMethodSchema = z.enum(['email', 'whatsapp']);

const billingTypeTranslations = {
  RENT: 'Rent',
  DEPOSIT: 'Deposit',
  UTILITY: 'Utility',
  MAINTENANCE: 'Maintenance',
  OTHER: 'Other',
  CUSTOM: 'Custom',
} as const;

export const billingRouter = createTRPCRouter({
  createPayment: protectedProcedure.input(paymentSchema).mutation(async ({ input, ctx }) => {
    const tenant = await ctx.db.tenant.findFirst({
      where: {
        id: input.tenantId,
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

    if (!tenant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tenant not found or you do not have access to this tenant',
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
        console.error('Failed to create Stripe payment:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create Stripe payment',
        });
      }
    }

    // Send payment link to tenant
    if (payment.stripePaymentId) {
      const stripeStatus = await retrievePaymentIntent(payment.stripePaymentId);

      if (stripeStatus.status === 'succeeded') {
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
          tenant: {
            room: {
              property: {
                userId: ctx.session.user.id,
              },
            },
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
          createdAt: 'desc',
        },
      });

      // Check status of pending Stripe payments
      await Promise.all(
        payments.map(async payment => {
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
                case 'succeeded':
                  newStatus = PaymentStatus.PAID;
                  paidAt = new Date();
                  break;
                case 'canceled':
                  newStatus = PaymentStatus.CANCELLED;
                  break;
                case 'requires_payment_method':
                case 'requires_confirmation':
                case 'requires_action':
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
              console.error(
                `Failed to check Stripe payment status for payment ${payment.id}:`,
                error
              );
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
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      // Prevent manual status changes for Stripe payments
      if (payment.method === PaymentMethod.STRIPE) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot manually update status of Stripe payments',
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
          code: 'NOT_FOUND',
          message: 'Payment not found or no Stripe ID associated',
        });
      }

      try {
        const stripeStatus = await retrievePaymentIntent(payment.stripePaymentId);

        let newStatus: PaymentStatus = payment.status;
        let paidAt = payment.paidAt;

        switch (stripeStatus.status) {
          case 'succeeded':
            newStatus = PaymentStatus.PAID;
            paidAt = new Date();
            break;
          case 'canceled':
            newStatus = PaymentStatus.CANCELLED;
            break;
          case 'requires_payment_method':
          case 'requires_confirmation':
          case 'requires_action':
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
        console.error('Failed to check Stripe payment status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check payment status',
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
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      if (payment.type !== PaymentType.DEPOSIT) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This payment is not a deposit',
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
      activeTenants.map(tenant =>
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
        timeRange: z.enum(['week', 'month', 'year']),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const startDate = new Date();

      switch (input.timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const baseWhere = {
        tenant: {
          room: {
            property: {
              userId: ctx.session.user.id,
            },
          },
        },
      };

      const [totalRevenue, pendingPayments, dueThisWeek, overduePayments] = await Promise.all([
        ctx.db.payment
          .findMany({
            where: {
              ...baseWhere,
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
          .then(payments => payments.reduce((sum, p) => sum + p.amount, 0)),
        ctx.db.payment.count({
          where: {
            ...baseWhere,
            status: PaymentStatus.PENDING,
          },
        }),
        ctx.db.payment.count({
          where: {
            ...baseWhere,
            status: PaymentStatus.PENDING,
            dueDate: {
              gte: now,
              lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        ctx.db.payment.count({
          where: {
            ...baseWhere,
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
        tenantId: z.string().optional(),
        method: z.enum(['email', 'whatsapp']),
        paymentType: z.nativeEnum(PaymentType),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If tenantId is provided, send to specific tenant
      // Otherwise, send to all tenants with pending payments
      const tenantsQuery = input.tenantId
        ? {
            id: input.tenantId,
            room: {
              property: {
                userId: ctx.session.user.id,
              },
            },
          }
        : {
            room: {
              property: {
                userId: ctx.session.user.id,
              },
            },
          };

      const tenants = await db.tenant.findMany({
        where: tenantsQuery,
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

      if (tenants.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No tenants found with pending payments',
        });
      }

      const results = await Promise.allSettled(
        tenants.map(async tenant => {
          if (tenant.payments.length === 0) {
            return;
          }

          for (const payment of tenant.payments) {
            try {
              // Generate Stripe payment link if not already present
              if (!payment.stripePaymentId) {
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

                if (input.method === 'whatsapp') {
                  await sendPaymentReminder(tenant, {
                    ...payment,
                    stripeClientSecret: stripePayment.clientSecret,
                  });
                } else {
                  await sendInvoiceEmail({
                    email: tenant.email,
                    tenantName: tenant.name,
                    propertyName: tenant.room.property.name,
                    roomNumber: tenant.room.number,
                    amount: payment.amount,
                    dueDate: payment.dueDate,
                    paymentLink: `https://checkout.stripe.com/pay/${stripePayment.paymentIntentId}`,
                    paymentType: payment.type,
                    invoiceNumber: `INV-${payment.id}`,
                  });
                }
              } else {
                // Use existing Stripe payment link
                if (input.method === 'whatsapp') {
                  await sendPaymentReminder(tenant, payment);
                } else {
                  await sendInvoiceEmail({
                    email: tenant.email,
                    tenantName: tenant.name,
                    propertyName: tenant.room.property.name,
                    roomNumber: tenant.room.number,
                    amount: payment.amount,
                    dueDate: payment.dueDate,
                    paymentLink: `https://checkout.stripe.com/pay/${payment.stripePaymentId}`,
                    paymentType: payment.type,
                    invoiceNumber: `INV-${payment.id}`,
                  });
                }
              }
            } catch (error) {
              console.error(
                `Failed to send ${input.method} notification to tenant ${tenant.id}:`,
                error
              );
              throw error;
            }
          }
        })
      );

      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to send some notifications: ${failures.length} failures`,
        });
      }

      return { success: true };
    }),

  create: protectedProcedure.input(billingSchema).mutation(async ({ input, ctx }) => {
    const { tenantId, ...data } = input;

    // Get active tenants based on whether tenantId is provided
    const tenantsQuery = tenantId
      ? {
          id: tenantId,
          status: TenantStatus.ACTIVE,
          room: {
            property: {
              userId: ctx.session.user.id,
            },
          },
        }
      : {
          status: TenantStatus.ACTIVE,
          room: {
            property: {
              userId: ctx.session.user.id,
            },
          },
        };

    const tenants = await db.tenant.findMany({
      where: tenantsQuery,
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });

    if (tenants.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active tenants found',
      });
    }

    // Create billings for each tenant
    const billings = await db.$transaction(
      tenants.map(tenant =>
        db.billing.create({
          data: {
            ...data,
            tenantId: tenant.id,
            status: BillingStatus.DRAFT,
          },
          include: {
            tenant: {
              include: {
                room: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
        })
      )
    );

    return billings;
  }),

  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        propertyId: z.string().optional(),
        status: z.nativeEnum(BillingStatus).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { search, propertyId, status } = input;

      const where: Prisma.BillingWhereInput = {
        tenant: {
          room: propertyId
            ? {
                propertyId,
                property: {
                  userId: ctx.session.user.id,
                },
              }
            : {
                property: {
                  userId: ctx.session.user.id,
                },
              },
        },
        status,
        ...(search && {
          OR: [
            {
              title: {
                contains: search,
                mode: 'insensitive' as Prisma.QueryMode,
              },
            },
            {
              description: {
                contains: search,
                mode: 'insensitive' as Prisma.QueryMode,
              },
            },
          ],
        }),
      };

      const [billings, total] = await Promise.all([
        db.billing.findMany({
          where,
          include: {
            tenant: {
              include: {
                room: {
                  include: {
                    property: true,
                  },
                },
              },
            },
            payments: {
              include: {
                tenant: {
                  include: {
                    room: {
                      include: {
                        property: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        db.billing.count({ where }),
      ]);

      return { billings, total };
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const billing = await db.billing.findFirst({
      where: {
        id: input.id,
        tenant: {
          room: {
            property: {
              userId: ctx.session.user.id,
            },
          },
        },
      },
      include: {
        tenant: {
          include: {
            room: {
              include: {
                property: true,
              },
            },
          },
        },
        payments: {
          include: {
            tenant: {
              include: {
                room: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!billing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Billing not found',
      });
    }

    return billing;
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: billingSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const billing = await db.billing.findFirst({
        where: {
          id: input.id,
          tenant: {
            room: {
              property: {
                userId: ctx.session.user.id,
              },
            },
          },
        },
      });

      if (!billing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Billing not found',
        });
      }

      return db.billing.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const billing = await db.billing.findFirst({
        where: {
          id: input.id,
          tenant: {
            room: {
              property: {
                userId: ctx.session.user.id,
              },
            },
          },
        },
      });

      if (!billing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Billing not found',
        });
      }

      return db.billing.delete({
        where: { id: input.id },
      });
    }),

  send: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const billing = await db.billing.findFirst({
      where: {
        id: input.id,
        tenant: {
          room: {
            property: {
              userId: ctx.session.user.id,
            },
          },
        },
      },
      include: {
        tenant: {
          include: {
            room: {
              include: {
                property: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!billing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Billing not found',
      });
    }

    if (!billing.tenant) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Billing has no associated tenant',
      });
    }

    if (billing.status !== BillingStatus.DRAFT) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Billing has already been sent',
      });
    }

    // Check if payment already exists for this billing
    if (billing.payments.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Payment already exists for this billing',
      });
    }

    // Create payment for the tenant
    await db.$transaction([
      db.payment.create({
        data: {
          amount: billing.amount,
          type: PaymentType.RENT,
          status: PaymentStatus.PENDING,
          dueDate: billing.dueDate,
          description: billing.description || undefined,
          billingId: billing.id,
          tenantId: billing.tenant.id,
          propertyId: billing.tenant.room.property.id,
        },
      }),
      db.billing.update({
        where: { id: billing.id },
        data: { status: BillingStatus.SENT },
      }),
    ]);

    return billing;
  }),

  sendBillingNotification: protectedProcedure
    .input(
      z.object({
        billingId: z.string(),
        method: notificationMethodSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { billingId, method } = input;

      const billing = await db.billing.findFirst({
        where: {
          id: billingId,
          tenant: {
            room: {
              property: {
                userId: ctx.session.user.id,
              },
            },
          },
        },
        include: {
          tenant: {
            include: {
              room: {
                include: {
                  property: true,
                },
              },
            },
          },
        },
      });

      if (!billing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Billing not found',
        });
      }

      if (!billing.tenant) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Billing has no tenant assigned',
        });
      }

      // Send notification based on method
      if (method === 'email') {
        await sendBillingEmail({
          to: billing.tenant.email,
          tenant: billing.tenant,
          billing,
        });
      } else {
        await sendBillingWhatsApp({
          phone: billing.tenant.phone,
          tenant: billing.tenant,
          billing,
        });
      }

      return { success: true };
    }),

  sendPaymentNotification: protectedProcedure
    .input(
      z.object({
        billingId: z.string(),
        tenantId: z.string(),
        method: notificationMethodSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { billingId, tenantId, method } = input;

      const billing = await db.billing.findFirst({
        where: {
          id: billingId,
          tenant: {
            id: tenantId,
            room: {
              property: {
                userId: ctx.session.user.id,
              },
            },
          },
        },
        include: {
          tenant: {
            include: {
              room: {
                include: {
                  property: true,
                },
              },
            },
          },
          payments: {
            where: {
              tenantId,
            },
          },
        },
      });

      if (!billing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Billing not found',
        });
      }

      if (!billing.tenant) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Billing has no tenant assigned',
        });
      }

      // Send notification based on method
      if (method === 'email') {
        await sendPaymentReminderEmail({
          to: billing.tenant.email,
          tenant: billing.tenant,
          billing,
        });
      } else {
        await sendPaymentReminderWhatsApp({
          phone: billing.tenant.phone,
          tenant: billing.tenant,
          billing,
        });
      }

      return { success: true };
    }),

  uploadPaymentProof: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
        receiptUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const payment = await db.payment.findUnique({
        where: { id: input.paymentId },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      // Update payment with receipt and mark as paid
      await db.payment.update({
        where: { id: input.paymentId },
        data: {
          proofOfPayment: input.receiptUrl,
          status: PaymentStatus.PAID,
          paidAt: new Date(),
        },
      });

      return { success: true };
    }),

  // Commented out until Contract model is implemented
  /*
  generateFromContract: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        count: z.number().min(1).max(12).default(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get the contract and payment schedules
        const contract = await db.contract.findUnique({
          where: { id: input.contractId },
          include: {
            property: true,
            tenant: true,
            paymentSchedules: {
              orderBy: { nextDueDate: 'asc' },
            },
          },
        });

        if (!contract) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contract not found',
          });
        }

        // Check if the user has permission
        if (contract.property.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to generate billings for this contract',
          });
        }

        // Check if there are payment schedules
        if (contract.paymentSchedules.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No payment schedules found for this contract',
          });
        }

        const schedule = contract.paymentSchedules[0];

        // Check if there are enough remaining payments
        if (schedule.remainingPayments < input.count) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot generate ${input.count} billings. Only ${schedule.remainingPayments} payments remaining.`,
          });
        }

        // Generate the billings
        const billings = [];
        let currentDueDate = new Date(schedule.nextDueDate);

        for (let i = 0; i < input.count; i++) {
          const billing = await db.billing.create({
            data: {
              title: `Rent for ${currentDueDate.toLocaleDateString()}`,
              description: `Scheduled rent payment for ${contract.tenant.name}`,
              amount: schedule.amount,
              dueDate: currentDueDate,
              status: 'DRAFT',
              type: 'RENT',
              tenantId: contract.tenantId,
              contractId: contract.id,
            },
          });

          billings.push(billing);

          // Calculate the next due date
          currentDueDate = calculateNextDueDate(currentDueDate, schedule.frequency);
        }

        // Update the payment schedule
        await db.paymentSchedule.update({
          where: { id: schedule.id },
          data: {
            nextDueDate: currentDueDate,
          },
        });

        return billings;
      } catch (error) {
        console.error('Billing generation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate billings',
          cause: error,
        });
      }
    }),
  */

  // Commented out until Contract model is implemented
  /*
  getByContract: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        status: z.nativeEnum(BillingStatus).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { contractId, status, page, limit } = input;
        const skip = (page - 1) * limit;

        // Check if the contract exists and belongs to the user
        const contract = await db.contract.findUnique({
          where: { id: contractId },
          include: { property: true },
        });

        if (!contract) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contract not found',
          });
        }

        if (contract.property.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view billings for this contract',
          });
        }

        // Build the where clause
        const where = {
          contractId,
          ...(status ? { status } : {}),
        };

        // Get billings and total count
        const [billings, total] = await Promise.all([
          db.billing.findMany({
            where,
            include: {
              tenant: true,
              payments: true,
            },
            orderBy: { dueDate: 'desc' },
            skip,
            take: limit,
          }),
          db.billing.count({ where }),
        ]);

        return {
          billings,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        console.error('Contract billings fetch error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch contract billings',
          cause: error,
        });
      }
    }),
  */

  getPreviewTenants: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        propertyGroupId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { propertyId, propertyGroupId } = input;

      const where = {
        status: TenantStatus.ACTIVE,
        room: {
          property: propertyId
            ? { id: propertyId, userId: ctx.session.user.id }
            : propertyGroupId
              ? { propertyGroupId, userId: ctx.session.user.id }
              : { userId: ctx.session.user.id },
        },
      };

      const tenants = await db.tenant.findMany({
        where,
        include: {
          room: {
            include: {
              property: true,
            },
          },
          payments: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: {
          room: {
            property: {
              name: 'asc',
            },
          },
        },
      });

      return tenants;
    }),

  generateBulk: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        propertyGroupId: z.string().optional(),
        billingType: z.nativeEnum(PaymentType),
        dueDate: z.date(),
        selectedTenantIds: z.array(z.string()),
        isAdvanceBilling: z.boolean(),
        billingMonths: z.number().min(1).max(12),
        adjustmentPercentage: z.number().min(-100).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const {
        propertyId,
        propertyGroupId,
        billingType,
        dueDate,
        selectedTenantIds,
        isAdvanceBilling,
        billingMonths,
        adjustmentPercentage,
      } = input;

      // Get selected tenants
      const tenants = await db.tenant.findMany({
        where: {
          id: { in: selectedTenantIds },
          status: TenantStatus.ACTIVE,
          room: {
            property: propertyId
              ? { id: propertyId, userId: ctx.session.user.id }
              : propertyGroupId
                ? { propertyGroupId, userId: ctx.session.user.id }
                : { userId: ctx.session.user.id },
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

      if (tenants.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No active tenants found',
        });
      }

      const errors: Array<{
        tenantId: string;
        tenantName: string;
        error: string;
      }> = [];
      const billings: Array<any> = [];

      // Generate billings for each tenant
      for (const tenant of tenants) {
        try {
          const baseAmount = tenant.rentAmount || tenant.room.price;
          const adjustedAmount = baseAmount + (baseAmount * adjustmentPercentage) / 100;

          // Generate billings for each month if advance billing
          const monthsToGenerate = isAdvanceBilling ? billingMonths : 1;
          for (let i = 0; i < monthsToGenerate; i++) {
            const currentDueDate = new Date(dueDate);
            currentDueDate.setMonth(currentDueDate.getMonth() + i);

            const billing = await db.billing.create({
              data: {
                title: `${billingTypeTranslations[billingType]} - ${format(
                  currentDueDate,
                  'MMMM yyyy'
                )}`,
                description: `${billingTypeTranslations[billingType]} for Room ${
                  tenant.room.number
                } at ${tenant.room.property.name}`,
                amount: adjustedAmount,
                dueDate: currentDueDate,
                type: billingType,
                status: BillingStatus.DRAFT,
                tenantId: tenant.id,
              },
            });

            billings.push(billing);
          }
        } catch (error) {
          console.error(`Failed to generate billing for tenant ${tenant.name}:`, error);
          errors.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            error: error instanceof Error ? error.message : 'Failed to generate billing',
          });
        }
      }

      return {
        billings,
        errors,
        totalGenerated: billings.length,
        totalFailed: errors.length,
      };
    }),

  markAsPaid: protectedProcedure
    .input(
      z.object({
        billingId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const billing = await db.billing.findFirst({
        where: {
          id: input.billingId,
          tenant: {
            room: {
              property: {
                userId: ctx.session.user.id,
              },
            },
          },
        },
        include: {
          tenant: {
            include: {
              room: {
                include: {
                  property: true,
                },
              },
            },
          },
        },
      });

      if (!billing || !billing.tenant || !billing.tenantId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Billing not found',
        });
      }

      // Create payment data
      const paymentData: Prisma.PaymentCreateInput = {
        amount: billing.amount,
        type: billing.type,
        method: PaymentMethod.MANUAL,
        status: PaymentStatus.PAID,
        dueDate: billing.dueDate,
        billing: { connect: { id: billing.id } },
        tenant: { connect: { id: billing.tenantId } },
        property: { connect: { id: billing.tenant.room.propertyId } },
        paidAt: new Date(),
      };

      // Add description only if it exists
      if (billing.description) {
        paymentData.description = billing.description;
      }

      // Create a payment record for this billing
      const payment = await db.payment.create({
        data: paymentData,
      });

      // Update billing status
      await db.billing.update({
        where: { id: input.billingId },
        data: {
          status: BillingStatus.PAID,
        },
      });

      return { success: true, payment };
    }),
});

// Helper function to calculate the next due date based on frequency
function calculateNextDueDate(currentDate: Date, frequency: PaymentFrequency): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case PaymentFrequency.DAILY:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case PaymentFrequency.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case PaymentFrequency.BI_WEEKLY:
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case PaymentFrequency.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case PaymentFrequency.QUARTERLY:
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case PaymentFrequency.SEMI_ANNUAL:
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case PaymentFrequency.ANNUAL:
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
  }

  return nextDate;
}
