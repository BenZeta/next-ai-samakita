import { db } from '@/lib/db';
import { PaymentMethod, PaymentStatus, PaymentType, Prisma, TenantStatus } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { format } from 'date-fns';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

// Schema for payment creation and updates
const paymentSchema = z.object({
  amount: z.number().min(0),
  type: z.nativeEnum(PaymentType),
  status: z.nativeEnum(PaymentStatus).default('PENDING'),
  method: z.nativeEnum(PaymentMethod).default('MANUAL'),
  dueDate: z.date(),
  paidAt: z.date().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  proofOfPayment: z.string().optional(),
  tenantId: z.string(),
  propertyId: z.string(),
  billingId: z.string().optional(),
});

export const paymentRouter = createTRPCRouter({
  create: protectedProcedure.input(paymentSchema).mutation(async ({ input, ctx }) => {
    try {
      // Check if the property belongs to the user
      const property = await db.property.findUnique({
        where: {
          id: input.propertyId,
          userId: ctx.session.user.id,
        },
      });

      if (!property) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create payments for this property',
        });
      }

      // Create the payment
      return await db.payment.create({
        data: input,
      });
    } catch (error) {
      console.error('Payment creation error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create payment',
        cause: error,
      });
    }
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    try {
      const payment = await db.payment.findUnique({
        where: { id: input.id },
        include: {
          tenant: true,
          property: true,
          billing: true,
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      // Check if the user has permission to view this payment
      if (payment.propertyId) {
        const property = await db.property.findUnique({
          where: { id: payment.propertyId },
        });

        if (!property || property.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this payment',
          });
        }
      }

      return payment;
    } catch (error) {
      console.error('Payment fetch error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch payment',
        cause: error,
      });
    }
  }),

  list: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        tenantId: z.string().optional(),
        billingId: z.string().optional(),
        status: z.nativeEnum(PaymentStatus).optional(),
        type: z.nativeEnum(PaymentType).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { page, limit, search, startDate, endDate, ...filters } = input;
        const skip = (page - 1) * limit;

        // Build the where clause
        const where: Prisma.PaymentWhereInput = {
          property: {
            userId: ctx.session.user.id,
          },
          ...filters,
          ...(startDate && endDate
            ? {
                dueDate: {
                  gte: startDate,
                  lte: endDate,
                },
              }
            : {}),
          ...(search
            ? {
                OR: [
                  {
                    tenant: {
                      name: {
                        contains: search,
                        mode: Prisma.QueryMode.insensitive,
                      },
                    },
                  },
                  {
                    description: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                ],
              }
            : {}),
        };

        // Get payments and total count
        const [payments, total] = await Promise.all([
          db.payment.findMany({
            where,
            include: {
              tenant: true,
              property: true,
              billing: true,
            },
            orderBy: { dueDate: 'desc' },
            skip,
            take: limit,
          }),
          db.payment.count({ where }),
        ]);

        return {
          payments,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        console.error('Payment list error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch payments',
          cause: error,
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: paymentSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if the payment exists and belongs to the user
        const existingPayment = await db.payment.findUnique({
          where: { id: input.id },
          include: { property: true },
        });

        if (!existingPayment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment not found',
          });
        }

        if (existingPayment.property.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this payment',
          });
        }

        // Update the payment
        return await db.payment.update({
          where: { id: input.id },
          data: input.data,
        });
      } catch (error) {
        console.error('Payment update error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update payment',
          cause: error,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if the payment exists and belongs to the user
        const existingPayment = await db.payment.findUnique({
          where: { id: input.id },
          include: { property: true },
        });

        if (!existingPayment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment not found',
          });
        }

        if (existingPayment.property.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this payment',
          });
        }

        // Delete the payment
        await db.payment.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        console.error('Payment delete error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete payment',
          cause: error,
        });
      }
    }),

  getUpcoming: protectedProcedure
    .input(
      z.object({
        propertyId: z.string(),
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Check if the property belongs to the user
        const property = await db.property.findUnique({
          where: {
            id: input.propertyId,
            userId: ctx.session.user.id,
          },
        });

        if (!property) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view payments for this property',
          });
        }

        // Calculate the date range
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(now.getDate() + input.days);

        // Get upcoming payments
        return await db.payment.findMany({
          where: {
            propertyId: input.propertyId,
            status: 'PENDING',
            dueDate: {
              gte: now,
              lte: endDate,
            },
          },
          include: {
            tenant: true,
          },
          orderBy: { dueDate: 'asc' },
        });
      } catch (error) {
        console.error('Upcoming payments fetch error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch upcoming payments',
          cause: error,
        });
      }
    }),

  getOverdue: protectedProcedure
    .input(
      z.object({
        propertyId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Check if the property belongs to the user
        const property = await db.property.findUnique({
          where: {
            id: input.propertyId,
            userId: ctx.session.user.id,
          },
        });

        if (!property) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view payments for this property',
          });
        }

        // Get overdue payments
        return await db.payment.findMany({
          where: {
            propertyId: input.propertyId,
            status: { in: ['PENDING', 'OVERDUE'] },
            dueDate: {
              lt: new Date(),
            },
          },
          include: {
            tenant: true,
          },
          orderBy: { dueDate: 'asc' },
        });
      } catch (error) {
        console.error('Overdue payments fetch error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch overdue payments',
          cause: error,
        });
      }
    }),

  generateBatch: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        propertyGroupId: z.string().optional(),
        paymentMethod: z.nativeEnum(PaymentMethod),
        periodStartDate: z.date(),
        dueDate: z.date(),
        selectedTenantIds: z.array(z.string()),
        isAdvancePayment: z.boolean(),
        generateForMonths: z.number().min(1).max(12),
        includeLateFee: z.boolean(),
        lateFeePercentage: z.number().min(0).max(100),
        adjustmentPercentage: z.number().min(-100).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        propertyId,
        propertyGroupId,
        paymentMethod,
        periodStartDate,
        dueDate,
        selectedTenantIds,
        isAdvancePayment,
        generateForMonths,
        includeLateFee,
        lateFeePercentage,
        adjustmentPercentage,
      } = input;

      // Get tenants based on selection criteria
      const where: Prisma.TenantWhereInput = {
        AND: [
          selectedTenantIds.length > 0 ? { id: { in: selectedTenantIds } } : undefined,
          propertyId
            ? { room: { propertyId } }
            : propertyGroupId
              ? {
                  room: {
                    property: {
                      propertyGroup: {
                        id: propertyGroupId,
                      },
                    },
                  },
                }
              : undefined,
          { status: TenantStatus.ACTIVE },
        ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition)),
      };

      const tenants = await ctx.db.tenant.findMany({
        where,
        include: {
          room: {
            include: {
              property: true,
            },
          },
          payments: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });

      const payments: Array<Prisma.PaymentGetPayload<{}>> = [];
      const errors: Array<{
        tenantId: string;
        tenantName: string;
        error: string;
      }> = [];

      // Generate payments for each tenant
      for (const tenant of tenants) {
        try {
          const baseAmount = tenant.rentAmount || tenant.room.price;
          let adjustedAmount = baseAmount;

          // Apply late fee if enabled
          if (includeLateFee) {
            const lateFeeAmount = (baseAmount * lateFeePercentage) / 100;
            adjustedAmount += lateFeeAmount;
          }

          // Apply bulk adjustment if any
          if (adjustmentPercentage !== 0) {
            const adjustmentAmount = (adjustedAmount * adjustmentPercentage) / 100;
            adjustedAmount += adjustmentAmount;
          }

          // Generate payments for multiple months if advance payment
          const monthsToGenerate = isAdvancePayment ? generateForMonths : 1;
          for (let i = 0; i < monthsToGenerate; i++) {
            const periodStart = new Date(periodStartDate);
            periodStart.setMonth(periodStart.getMonth() + i);

            const periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            periodEnd.setDate(periodEnd.getDate() - 1);

            const payment = await ctx.db.payment.create({
              data: {
                amount: adjustedAmount,
                type: PaymentType.RENT,
                method: paymentMethod,
                status: PaymentStatus.PENDING,
                dueDate: new Date(dueDate),
                billingCycleStart: periodStart,
                billingCycleEnd: periodEnd,
                tenantId: tenant.id,
                propertyId: tenant.room.propertyId,
                description: `Rent payment for ${tenant.room.property.name} - Room ${
                  tenant.room.number
                } (${format(periodStart, 'MMM yyyy')})`,
              },
            });

            payments.push(payment);
          }
        } catch (error) {
          console.error(`Failed to generate payment for tenant ${tenant.id}:`, error);
          errors.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        payments,
        errors,
        totalGenerated: payments.length,
        totalFailed: errors.length,
      };
    }),
});
