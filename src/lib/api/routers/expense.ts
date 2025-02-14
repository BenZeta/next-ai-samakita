import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { ExpenseCategory } from "@prisma/client";

const expenseSchema = z.object({
  propertyId: z.string(),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.number().min(0),
  date: z.date(),
  description: z.string().optional(),
  vendor: z.string().optional(),
  receiptUrl: z.string().url().optional(),
});

export const expenseRouter = createTRPCRouter({
  create: protectedProcedure.input(expenseSchema).mutation(async ({ input, ctx }) => {
    const property = await db.property.findUnique({
      where: { id: input.propertyId },
    });

    if (!property || property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to add expenses to this property",
      });
    }

    return db.expense.create({
      data: {
        propertyId: input.propertyId,
        date: input.date,
        amount: input.amount,
        category: input.category,
        description: input.description || "",
        receipt: input.receiptUrl,
      },
    });
  }),

  list: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        category: z.nativeEnum(ExpenseCategory).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        page: z.number().min(1).optional(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { propertyId, category, startDate, endDate, page = 1, limit = 10 } = input;

      const where = {
        property: {
          userId: ctx.session.user.id,
        },
        ...(propertyId && { propertyId }),
        ...(category && { category }),
        ...(startDate && { date: { gte: startDate } }),
        ...(endDate && { date: { lte: endDate } }),
      };

      const [expenses, total] = await Promise.all([
        db.expense.findMany({
          where,
          include: {
            property: true,
          },
          orderBy: { date: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.expense.count({ where }),
      ]);

      // Calculate summary statistics
      const summary = await db.expense.groupBy({
        by: ["category"],
        where,
        _sum: {
          amount: true,
        },
      });

      const byCategory = Object.fromEntries(summary.map((item) => [item.category, item._sum.amount || 0]));

      const totalAmount = Object.values(byCategory).reduce((acc, curr) => acc + curr, 0);

      return {
        expenses,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          total: totalAmount,
          byCategory,
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
        include: {
          property: true,
        },
      });

      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      if (expense.property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this expense",
        });
      }

      const { id, ...data } = input;

      return db.expense.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const expense = await db.expense.findUnique({
      where: { id: input.id },
      include: {
        property: true,
      },
    });

    if (!expense) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Expense not found",
      });
    }

    if (expense.property.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to delete this expense",
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
          code: "NOT_FOUND",
          message: "Property not found",
        });
      }

      if (property.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view statistics for this property",
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
          status: "PAID",
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

      const expensesByCategory = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<ExpenseCategory, number>);

      return {
        totalExpenses,
        totalIncome,
        netIncome,
        expensesByCategory,
        expenseCount: expenses.length,
        paymentCount: payments.length,
      };
    }),
});
