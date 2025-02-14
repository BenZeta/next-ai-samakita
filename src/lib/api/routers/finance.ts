import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { PaymentStatus, PaymentType, ExpenseCategory } from "@prisma/client";

interface MonthlyTrendItem {
  label: string;
  income: number;
  expenses: number;
}

export const financeRouter = createTRPCRouter({
  getProfitLoss: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        timeRange: z.enum(["month", "quarter", "year"]),
      })
    )
    .query(async ({ input, ctx }) => {
      const { propertyId, timeRange } = input;

      // Calculate date ranges
      const now = new Date();
      let startDate = new Date();
      let previousStartDate = new Date();

      if (timeRange === "month") {
        startDate.setMonth(now.getMonth(), 1);
        previousStartDate.setMonth(now.getMonth() - 1, 1);
      } else if (timeRange === "quarter") {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate.setMonth(quarterStart, 1);
        previousStartDate.setMonth(quarterStart - 3, 1);
      } else {
        startDate.setMonth(0, 1);
        previousStartDate.setFullYear(now.getFullYear() - 1, 0, 1);
      }

      // Get current period income
      const income = await db.payment.aggregate({
        where: {
          tenant: {
            room: {
              ...(propertyId ? { propertyId } : {}),
              property: {
                userId: ctx.session.user.id,
              },
            },
          },
          status: PaymentStatus.paid,
          paidAt: {
            gte: startDate,
            lt: now,
          },
        },
        _sum: {
          amount: true,
        },
      });

      // Get previous period income
      const previousIncome = await db.payment.aggregate({
        where: {
          tenant: {
            room: {
              ...(propertyId ? { propertyId } : {}),
              property: {
                userId: ctx.session.user.id,
              },
            },
          },
          status: PaymentStatus.paid,
          paidAt: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
        _sum: {
          amount: true,
        },
      });

      // Get current period expenses
      const expenses = await db.expense.aggregate({
        where: {
          ...(propertyId ? { propertyId } : {}),
          property: {
            userId: ctx.session.user.id,
          },
          date: {
            gte: startDate,
            lt: now,
          },
        },
        _sum: {
          amount: true,
        },
      });

      // Get previous period expenses
      const previousExpenses = await db.expense.aggregate({
        where: {
          ...(propertyId ? { propertyId } : {}),
          property: {
            userId: ctx.session.user.id,
          },
          date: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
        _sum: {
          amount: true,
        },
      });

      // Calculate growth rates
      const currentIncome = income._sum.amount ?? 0;
      const prevIncome = previousIncome._sum.amount ?? 0;
      const incomeGrowth = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0;

      const currentExpenses = expenses._sum.amount ?? 0;
      const prevExpenses = previousExpenses._sum.amount ?? 0;
      const expenseGrowth = prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0;

      // Get income breakdown by type
      const incomeByType = await Promise.all(
        Object.values(PaymentType).map(async (type) => {
          const result = await db.payment.aggregate({
            where: {
              tenant: {
                room: {
                  ...(propertyId ? { propertyId } : {}),
                  property: {
                    userId: ctx.session.user.id,
                  },
                },
              },
              status: PaymentStatus.paid,
              type,
              paidAt: {
                gte: startDate,
                lt: now,
              },
            },
            _sum: {
              amount: true,
            },
          });
          return { type, amount: result._sum.amount ?? 0 };
        })
      );

      // Get expense breakdown by category
      const expenseByCategory = await Promise.all(
        Object.values(ExpenseCategory).map(async (category) => {
          const result = await db.expense.aggregate({
            where: {
              ...(propertyId ? { propertyId } : {}),
              property: {
                userId: ctx.session.user.id,
              },
              category,
              date: {
                gte: startDate,
                lt: now,
              },
            },
            _sum: {
              amount: true,
            },
          });
          return { category, amount: result._sum.amount ?? 0 };
        })
      );

      // Get monthly trend
      const monthlyTrend: MonthlyTrendItem[] = [];
      let maxMonthlyAmount = 0;

      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now);
        monthStart.setMonth(now.getMonth() - i, 1);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthStart.getMonth() + 1, 0);

        const monthIncome = await db.payment.aggregate({
          where: {
            tenant: {
              room: {
                ...(propertyId ? { propertyId } : {}),
                property: {
                  userId: ctx.session.user.id,
                },
              },
            },
            status: PaymentStatus.paid,
            paidAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const monthExpenses = await db.expense.aggregate({
          where: {
            ...(propertyId ? { propertyId } : {}),
            property: {
              userId: ctx.session.user.id,
            },
            date: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const monthIncomeAmount = monthIncome._sum.amount ?? 0;
        const monthExpensesAmount = monthExpenses._sum.amount ?? 0;

        maxMonthlyAmount = Math.max(maxMonthlyAmount, monthIncomeAmount, monthExpensesAmount);

        monthlyTrend.push({
          label: monthStart.toLocaleDateString("en-US", { month: "short" }),
          income: monthIncomeAmount,
          expenses: monthExpensesAmount,
        });
      }

      return {
        income: currentIncome,
        expenses: currentExpenses,
        incomeGrowth,
        expenseGrowth,
        incomeByType: Object.fromEntries(incomeByType.map(({ type, amount }) => [type, amount])),
        expenseByCategory: Object.fromEntries(expenseByCategory.map(({ category, amount }) => [category, amount])),
        monthlyTrend,
        maxMonthlyAmount,
      };
    }),
});
