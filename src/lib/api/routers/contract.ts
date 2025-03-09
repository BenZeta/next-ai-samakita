import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

// Schema for contract creation and updates
const contractSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  roomId: z.string().min(1, 'Room is required'),
  propertyId: z.string().min(1, 'Property is required'),
  startDate: z.date(),
  endDate: z.date(),
  totalAmount: z.number().min(0),
  depositAmount: z.number().min(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED']).default('ACTIVE'),
  documentUrl: z.string().optional(),
  notes: z.string().optional(),
  templateId: z.string().optional(),
});

// Schema for payment schedule creation
const paymentScheduleSchema = z.object({
  contractId: z.string().min(1, 'Contract is required'),
  frequency: z
    .enum([
      'DAILY',
      'WEEKLY',
      'BIWEEKLY',
      'MONTHLY',
      'QUARTERLY',
      'BIANNUALLY',
      'ANNUALLY',
      'CUSTOM',
    ])
    .default('MONTHLY'),
  dayOfMonth: z.number().min(1).max(31).optional(),
  dayOfWeek: z.number().min(1).max(7).optional(),
  startDate: z.date(),
  amount: z.number().min(0),
  totalPayments: z.number().min(1),
});

export const contractRouter = createTRPCRouter({
  // Create a new contract
  create: protectedProcedure.input(contractSchema).mutation(async ({ input, ctx }) => {
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
          message: 'You do not have permission to create contracts for this property',
        });
      }

      // Create the contract
      const contract = await db.contract.create({
        data: input,
      });

      return contract;
    } catch (error) {
      console.error('Contract creation error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create contract',
        cause: error,
      });
    }
  }),

  // Get a contract by ID
  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    try {
      const contract = await db.contract.findUnique({
        where: { id: input.id },
        include: {
          tenant: true,
          room: true,
          property: true,
          paymentSchedules: true,
          payments: {
            orderBy: { dueDate: 'asc' },
          },
        },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contract not found',
        });
      }

      // Check if the user has permission to view this contract
      if (contract.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this contract',
        });
      }

      return contract;
    } catch (error) {
      console.error('Contract fetch error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch contract',
        cause: error,
      });
    }
  }),

  // List contracts with filtering and pagination
  list: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        tenantId: z.string().optional(),
        roomId: z.string().optional(),
        status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED']).optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { page, limit, search, ...filters } = input;
        const skip = (page - 1) * limit;

        // Build the where clause
        const where: Prisma.ContractWhereInput = {
          property: {
            userId: ctx.session.user.id,
          },
          ...filters,
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
                    room: {
                      number: {
                        contains: search,
                        mode: Prisma.QueryMode.insensitive,
                      },
                    },
                  },
                ],
              }
            : {}),
        };

        // Get contracts and total count
        const [contracts, total] = await Promise.all([
          db.contract.findMany({
            where,
            include: {
              tenant: true,
              room: true,
              property: true,
              paymentSchedules: true,
            },
            orderBy: { startDate: 'desc' },
            skip,
            take: limit,
          }),
          db.contract.count({ where }),
        ]);

        return {
          contracts,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        console.error('Contract list error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch contracts',
          cause: error,
        });
      }
    }),

  // Update a contract
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: contractSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if the contract exists and belongs to the user
        const existingContract = await db.contract.findUnique({
          where: { id: input.id },
          include: { property: true },
        });

        if (!existingContract) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contract not found',
          });
        }

        if (existingContract.property.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this contract',
          });
        }

        // Update the contract
        const updatedContract = await db.contract.update({
          where: { id: input.id },
          data: input.data,
        });

        return updatedContract;
      } catch (error) {
        console.error('Contract update error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update contract',
          cause: error,
        });
      }
    }),

  // Delete a contract
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if the contract exists and belongs to the user
        const existingContract = await db.contract.findUnique({
          where: { id: input.id },
          include: { property: true },
        });

        if (!existingContract) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contract not found',
          });
        }

        if (existingContract.property.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this contract',
          });
        }

        // Delete the contract (this will cascade delete payment schedules)
        await db.contract.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        console.error('Contract delete error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete contract',
          cause: error,
        });
      }
    }),

  // Create a payment schedule for a contract
  createPaymentSchedule: protectedProcedure
    .input(paymentScheduleSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if the contract exists and belongs to the user
        const contract = await db.contract.findUnique({
          where: { id: input.contractId },
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
            message: 'You do not have permission to create payment schedules for this contract',
          });
        }

        // Calculate the next due date based on the frequency
        const startDate = input.startDate;
        let nextDueDate = new Date(startDate);

        // Calculate remaining payments based on contract end date
        const remainingPayments = input.totalPayments;

        // Create the payment schedule
        const paymentSchedule = await db.paymentSchedule.create({
          data: {
            ...input,
            nextDueDate,
            remainingPayments,
          },
        });

        return paymentSchedule;
      } catch (error) {
        console.error('Payment schedule creation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create payment schedule',
          cause: error,
        });
      }
    }),

  // Get payment schedules for a contract
  getPaymentSchedules: protectedProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // Check if the contract exists and belongs to the user
        const contract = await db.contract.findUnique({
          where: { id: input.contractId },
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
            message: 'You do not have permission to view payment schedules for this contract',
          });
        }

        // Get payment schedules
        const paymentSchedules = await db.paymentSchedule.findMany({
          where: { contractId: input.contractId },
          orderBy: { startDate: 'asc' },
        });

        return paymentSchedules;
      } catch (error) {
        console.error('Payment schedule fetch error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch payment schedules',
          cause: error,
        });
      }
    }),

  // Update a payment schedule
  updatePaymentSchedule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: paymentScheduleSchema.partial().omit({ contractId: true }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if the payment schedule exists and belongs to the user
        const paymentSchedule = await db.paymentSchedule.findUnique({
          where: { id: input.id },
          include: { contract: { include: { property: true } } },
        });

        if (!paymentSchedule) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment schedule not found',
          });
        }

        if (paymentSchedule.contract.property.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this payment schedule',
          });
        }

        // Update the payment schedule
        const updatedPaymentSchedule = await db.paymentSchedule.update({
          where: { id: input.id },
          data: input.data,
        });

        return updatedPaymentSchedule;
      } catch (error) {
        console.error('Payment schedule update error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update payment schedule',
          cause: error,
        });
      }
    }),

  // Delete a payment schedule
  deletePaymentSchedule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if the payment schedule exists and belongs to the user
        const paymentSchedule = await db.paymentSchedule.findUnique({
          where: { id: input.id },
          include: { contract: { include: { property: true } } },
        });

        if (!paymentSchedule) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Payment schedule not found',
          });
        }

        if (paymentSchedule.contract.property.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this payment schedule',
          });
        }

        // Delete the payment schedule
        await db.paymentSchedule.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        console.error('Payment schedule delete error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete payment schedule',
          cause: error,
        });
      }
    }),

  // Get contract templates
  getTemplates: protectedProcedure
    .input(
      z
        .object({
          isDefault: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      try {
        const where: Prisma.ContractTemplateWhereInput = {
          userId: ctx.session.user.id,
          ...(input?.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        };

        const templates = await db.contractTemplate.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });

        return templates;
      } catch (error) {
        console.error('Contract templates fetch error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch contract templates',
          cause: error,
        });
      }
    }),

  // Create a contract template
  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        description: z.string().optional(),
        content: z.string().min(1, 'Content is required'),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // If this is set as default, unset any existing default templates
        if (input.isDefault) {
          await db.contractTemplate.updateMany({
            where: {
              userId: ctx.session.user.id,
              isDefault: true,
            },
            data: {
              isDefault: false,
            },
          });
        }

        // Create the template
        const template = await db.contractTemplate.create({
          data: {
            ...input,
            userId: ctx.session.user.id,
          },
        });

        return template;
      } catch (error) {
        console.error('Contract template creation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create contract template',
          cause: error,
        });
      }
    }),

  // Update a contract template
  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().min(1, 'Name is required').optional(),
          description: z.string().optional(),
          content: z.string().min(1, 'Content is required').optional(),
          isDefault: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if the template exists and belongs to the user
        const template = await db.contractTemplate.findUnique({
          where: { id: input.id },
        });

        if (!template) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contract template not found',
          });
        }

        if (template.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this template',
          });
        }

        // If this is set as default, unset any existing default templates
        if (input.data.isDefault) {
          await db.contractTemplate.updateMany({
            where: {
              userId: ctx.session.user.id,
              isDefault: true,
              id: { not: input.id },
            },
            data: {
              isDefault: false,
            },
          });
        }

        // Update the template
        const updatedTemplate = await db.contractTemplate.update({
          where: { id: input.id },
          data: input.data,
        });

        return updatedTemplate;
      } catch (error) {
        console.error('Contract template update error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update contract template',
          cause: error,
        });
      }
    }),

  // Delete a contract template
  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if the template exists and belongs to the user
        const template = await db.contractTemplate.findUnique({
          where: { id: input.id },
        });

        if (!template) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Contract template not found',
          });
        }

        if (template.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this template',
          });
        }

        // Delete the template
        await db.contractTemplate.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        console.error('Contract template delete error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete contract template',
          cause: error,
        });
      }
    }),
});
