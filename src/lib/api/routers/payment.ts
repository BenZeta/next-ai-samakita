import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

// Schema for payment creation and updates
const paymentSchema = z.object({
  amount: z.number().min(0),
  type: z.enum(['RENT', 'DEPOSIT', 'UTILITY', 'MAINTENANCE', 'OTHER', 'CUSTOM']),
  status: z
    .enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'FAILED', 'REFUNDED', 'PARTIAL'])
    .default('PENDING'),
  method: z.enum(['MANUAL', 'STRIPE', 'BANK_TRANSFER', 'CASH', 'OTHER']).default('MANUAL'),
  dueDate: z.date(),
  paidAt: z.date().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  proofOfPayment: z.string().optional(),
  tenantId: z.string(),
  propertyId: z.string(),
  contractId: z.string().optional(),
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
      const payment = await db.payment.create({
        data: input,
      });

      /* Commented out until Contract and PaymentSchedule models are implemented
      // If this is a contract payment and it's marked as paid, update the payment schedule
      if (input.contractId && input.status === 'PAID') {
        const paymentSchedules = await db.paymentSchedule.findMany({
          where: { contractId: input.contractId },
          orderBy: { nextDueDate: 'asc' },
        });

        if (paymentSchedules.length > 0) {
          const currentSchedule = paymentSchedules[0];

          // Update the payment schedule with one less remaining payment
          if (currentSchedule.remainingPayments > 0) {
            await db.paymentSchedule.update({
              where: { id: currentSchedule.id },
              data: {
                remainingPayments: currentSchedule.remainingPayments - 1,
                // Calculate the next due date based on frequency
                nextDueDate: calculateNextDueDate(
                  currentSchedule.nextDueDate,
                  currentSchedule.frequency
                ),
              },
            });
          }
        }
      }
      */

      return payment;
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
          // contract: true, // Removed until Contract model is implemented
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      // Check if the user has permission to view this payment
      if (payment.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this payment',
        });
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
        contractId: z.string().optional(),
        billingId: z.string().optional(),
        status: z
          .enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'FAILED', 'REFUNDED', 'PARTIAL'])
          .optional(),
        type: z.enum(['RENT', 'DEPOSIT', 'UTILITY', 'MAINTENANCE', 'OTHER', 'CUSTOM']).optional(),
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
              // contract: true, // Removed until Contract model is implemented
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
        const updatedPayment = await db.payment.update({
          where: { id: input.id },
          data: input.data,
        });

        return updatedPayment;
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
        const payments = await db.payment.findMany({
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
            // contract: true, // Removed until Contract model is implemented
          },
          orderBy: { dueDate: 'asc' },
        });

        return payments;
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
        const payments = await db.payment.findMany({
          where: {
            propertyId: input.propertyId,
            status: { in: ['PENDING', 'OVERDUE'] },
            dueDate: {
              lt: new Date(),
            },
          },
          include: {
            tenant: true,
            // contract: true, // Removed until Contract model is implemented
          },
          orderBy: { dueDate: 'asc' },
        });

        return payments;
      } catch (error) {
        console.error('Overdue payments fetch error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch overdue payments',
          cause: error,
        });
      }
    }),

  // Commented out until PaymentSchedule model is implemented
  /*
  generateFromSchedule: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get the payment schedule
        const schedule = await db.paymentSchedule.findUnique({
          where: { id: input.scheduleId },
          include: {
            contract: {
              include: {
                property: true,
                tenant: true,
              },
            },
          },
        });

        if (!schedule) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment schedule not found',
          });
        }

        // Check if the user has permission
        if (schedule.contract.property.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to generate payments for this schedule',
          });
        }

        // Create the payment
        const payment = await db.payment.create({
          data: {
            amount: schedule.amount,
            type: schedule.type as PaymentType,
            status: 'PENDING',
            method: 'MANUAL',
            dueDate: schedule.nextDueDate,
            description: `Payment for ${schedule.contract.tenant.name}`,
            tenantId: schedule.contract.tenant.id,
            propertyId: schedule.contract.property.id,
            contractId: schedule.contract.id,
          },
        });

        // Update the payment schedule
        await db.paymentSchedule.update({
          where: { id: schedule.id },
          data: {
            remainingPayments: schedule.remainingPayments - 1,
            // Calculate the next due date based on frequency
            nextDueDate: calculateNextDueDate(schedule.nextDueDate, schedule.frequency),
          },
        });

        return payment;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate payment',
          cause: error,
        });
      }
    }),
  */
});

// Helper function to calculate the next due date based on frequency
function calculateNextDueDate(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'BIWEEKLY':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'BIANNUALLY':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'ANNUALLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
  }

  return nextDate;
}
