import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { ExpenseCategory } from "@prisma/client";

const expenseSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required"),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.number().min(0, "Amount must be greater than or equal to 0"),
  date: z.date(),
  description: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseRouter = createTRPCRouter({
  create: protectedProcedure.input(expenseSchema).mutation(async ({ input, ctx }) => {
    // Check if property exists and user has access
    const property = await db.property.findUnique({
      where: { id: input.propertyId },
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
        message: "You do not have permission to add expenses to this property",
      });
    }

    return db.expense.create({
      data: input,
    });
  }),

  list: protectedProcedure
    .input(
      z.object({
        propertyId: z.string(),
        category: z.nativeEnum(ExpenseCategory).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        minAmount: z.number().optional(),
        maxAmount: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { propertyId, category, startDate, endDate, minAmount, maxAmount } = input;

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
          message: "You do not have permission to view expenses for this property",
        });
      }

      const expenses = await db.expense.findMany({
        where: {
          propertyId,
          ...(category ? { category } : {}),
          ...(startDate || endDate
            ? {
                date: {
                  ...(startDate ? { gte: startDate } : {}),
                  ...(endDate ? { lte: endDate } : {}),
                },
              }
            : {}),
          ...(minAmount || maxAmount
            ? {
                amount: {
                  ...(minAmount ? { gte: minAmount } : {}),
                  ...(maxAmount ? { lte: maxAmount } : {}),
                },
              }
            : {}),
        },
        orderBy: {
          date: "desc",
        },
      });

      // Calculate summary statistics
      const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const byCategory = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<ExpenseCategory, number>);

      return {
        expenses,
        summary: {
          total,
          byCategory,
        },
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: expenseSchema.partial(),
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

      return db.expense.update({
        where: { id: input.id },
        data: input.data,
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

    await db.expense.delete({
      where: { id: input.id },
    });

    return { success: true };
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
          status: "paid",
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
