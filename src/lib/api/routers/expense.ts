import { db } from '@/lib/db';
import { ExpenseCategory, Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

// Helper function to check if a category is operational
function isOperationalExpense(category: ExpenseCategory): boolean {
  switch (category) {
    case ExpenseCategory.SALARY:
    case ExpenseCategory.STAFF_BENEFITS:
    case ExpenseCategory.STAFF_TRAINING:
    case ExpenseCategory.ELECTRICITY:
    case ExpenseCategory.WATER:
    case ExpenseCategory.INTERNET:
    case ExpenseCategory.GAS:
    case ExpenseCategory.CLEANING:
    case ExpenseCategory.REPAIRS:
    case ExpenseCategory.GARDENING:
    case ExpenseCategory.PEST_CONTROL:
    case ExpenseCategory.OFFICE_SUPPLIES:
    case ExpenseCategory.MARKETING:
    case ExpenseCategory.INSURANCE:
    case ExpenseCategory.TAX:
    case ExpenseCategory.LICENSE_PERMIT:
    case ExpenseCategory.SECURITY:
    case ExpenseCategory.WASTE_MANAGEMENT:
      return true;
    default:
      return false;
  }
}

// Helper function to get all operational categories
function getOperationalCategories(): ExpenseCategory[] {
  return Object.values(ExpenseCategory).filter(isOperationalExpense);
}

// Helper function to get all non-operational categories
function getNonOperationalCategories(): ExpenseCategory[] {
  return Object.values(ExpenseCategory).filter(category => !isOperationalExpense(category));
}

const expenseSchema = z.object({
  propertyId: z.string(),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.number().min(0),
  date: z.date(),
  description: z.string().optional(),
  vendor: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
});

export const expenseRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        category: z.nativeEnum(ExpenseCategory),
        amount: z.number().min(0),
        date: z.date(),
        description: z.string(),
        receiptUrl: z.string().optional(),
        vendor: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { propertyId, ...rest } = input;

      return db.expense.create({
        data: {
          ...rest,
          ...(propertyId && { propertyId }),
          userId: ctx.session.user.id,
        },
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        category: z.nativeEnum(ExpenseCategory).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        expenseType: z.enum(['OPERATIONAL', 'NON_OPERATIONAL', 'ALL']).default('ALL'),
      })
    )
    .query(async ({ input, ctx }) => {
      const { propertyId, category, startDate, endDate, page, limit, expenseType } = input;

      const baseWhere: Prisma.ExpenseWhereInput = {
        userId: ctx.session.user.id,
        ...(propertyId && { propertyId }),
        ...(!propertyId && {
          OR: [
            {
              property: {
                userId: ctx.session.user.id,
              },
            },
            {
              propertyId: null,
            },
          ],
        }),
      };

      // Add category filter based on expense type
      if (expenseType !== 'ALL') {
        baseWhere.category = {
          in:
            expenseType === 'OPERATIONAL'
              ? getOperationalCategories()
              : getNonOperationalCategories(),
        };
      }

      // Add specific category filter if provided
      if (category) {
        baseWhere.category = category;
      }

      // Add date range filters
      if (startDate || endDate) {
        baseWhere.date = {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        };
      }

      const [expenses, total] = await Promise.all([
        db.expense.findMany({
          where: baseWhere,
          include: {
            property: true,
          },
          orderBy: { date: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.expense.count({ where: baseWhere }),
      ]);

      // Calculate summary
      const summary = await db.expense.groupBy({
        by: ['category'],
        where: baseWhere,
        _sum: {
          amount: true,
        },
      });

      const totalAmount = summary.reduce((acc, curr) => acc + (curr._sum?.amount || 0), 0);
      const byCategory = Object.fromEntries(summary.map(s => [s.category, s._sum?.amount || 0]));

      // Calculate operational vs non-operational totals
      const operationalTotal = summary
        .filter(s => isOperationalExpense(s.category))
        .reduce((acc, curr) => acc + (curr._sum?.amount || 0), 0);

      const nonOperationalTotal = summary
        .filter(s => !isOperationalExpense(s.category))
        .reduce((acc, curr) => acc + (curr._sum?.amount || 0), 0);

      return {
        expenses,
        summary: {
          total: totalAmount,
          byCategory,
          operationalTotal,
          nonOperationalTotal,
        },
        pagination: {
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        category: z.nativeEnum(ExpenseCategory).optional(),
        amount: z.number().min(0).optional(),
        date: z.date().optional(),
        description: z.string().optional(),
        receiptUrl: z.string().optional(),
        vendor: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const expense = await db.expense.findUnique({
        where: { id: input.id },
      });

      if (!expense) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Expense not found',
        });
      }

      if (expense.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this expense',
        });
      }

      const { id, ...data } = input;

      return db.expense.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const expense = await db.expense.findUnique({
        where: { id: input.id },
      });

      if (!expense) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Expense not found',
        });
      }

      if (expense.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this expense',
        });
      }

      return db.expense.delete({
        where: { id: input.id },
      });
    }),

  getStatistics: protectedProcedure
    .input(
      z.object({
        propertyId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { propertyId, startDate, endDate } = input;

      // Check if user has access to the property
      const property = await db.property.findUnique({
        where: { id: propertyId },
      });

      if (!property) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Property not found',
        });
      }

      if (property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view statistics for this property',
        });
      }

      // Get expenses for the period
      const expenses = await db.expense.findMany({
        where: {
          propertyId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Get income (payments) for the period
      const payments = await db.payment.findMany({
        where: {
          tenant: {
            room: {
              propertyId,
            },
          },
          status: 'PAID',
          paidAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Calculate statistics
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalIncome = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const netIncome = totalIncome - totalExpenses;

      const expensesByCategory = expenses.reduce(
        (acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        },
        {} as Record<ExpenseCategory, number>
      );

      return {
        totalExpenses,
        totalIncome,
        netIncome,
        expensesByCategory,
        expenseCount: expenses.length,
        paymentCount: payments.length,
      };
    }),

  quickAddOperational: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        category: z.nativeEnum(ExpenseCategory),
        amount: z.number().min(0),
        description: z.string(),
        isRecurring: z.boolean(),
        recurringInterval: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { propertyId, category, amount, description, isRecurring, recurringInterval } = input;

      if (!isOperationalExpense(category)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only operational expenses can be quick added',
        });
      }

      const now = new Date();
      let nextDueDate: Date | undefined;

      if (isRecurring && recurringInterval) {
        nextDueDate = new Date(now);
        switch (recurringInterval) {
          case 'MONTHLY':
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case 'QUARTERLY':
            nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            break;
          case 'YEARLY':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
        }
      }

      return db.expense.create({
        data: {
          category,
          amount,
          date: now,
          description,
          ...(propertyId && { propertyId }),
          userId: ctx.session.user.id,
          isRecurring,
          ...(recurringInterval && { recurringInterval }),
          ...(nextDueDate && { nextDueDate }),
        },
      });
    }),

  processRecurringExpenses: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    const dueExpenses = await db.expense.findMany({
      where: {
        userId: ctx.session.user.id,
        isRecurring: true,
        nextDueDate: {
          lte: now,
        },
      },
    });

    const processedExpenses = await Promise.all(
      dueExpenses.map(async expense => {
        // Create new expense instance
        const newExpense = await db.expense.create({
          data: {
            category: expense.category,
            amount: expense.amount,
            date: now,
            description: expense.description,
            propertyId: expense.propertyId,
            userId: ctx.session.user.id,
            isRecurring: false,
          },
        });

        // Update next due date for original recurring expense
        let nextDueDate = new Date(expense.nextDueDate!);
        switch (expense.recurringInterval) {
          case 'DAILY':
            nextDueDate.setDate(nextDueDate.getDate() + 1);
            break;
          case 'WEEKLY':
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case 'BIWEEKLY':
            nextDueDate.setDate(nextDueDate.getDate() + 14);
            break;
          case 'MONTHLY':
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case 'QUARTERLY':
            nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            break;
          case 'SEMIANNUAL':
            nextDueDate.setMonth(nextDueDate.getMonth() + 6);
            break;
          case 'ANNUAL':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
          default:
            // Default to monthly if no frequency is specified
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        await db.expense.update({
          where: { id: expense.id },
          data: {
            lastProcessedDate: now,
            nextDueDate,
          },
        });

        return newExpense;
      })
    );

    return processedExpenses;
  }),
});
