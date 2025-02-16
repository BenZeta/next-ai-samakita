import { prisma } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

interface MonthlyTrendItem {
  label: string;
  income: number;
  expenses: number;
}

export const financeRouter = createTRPCRouter({
  getStats: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().optional(),
        timeRange: z.enum(['month', 'quarter', 'year']).default('month'),
      })
    )
    .query(async ({ input, ctx }) => {
      const { propertyId, timeRange } = input;

      // Get date ranges
      const now = new Date();
      let startDate = new Date();
      let previousStartDate = new Date();

      switch (timeRange) {
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          previousStartDate.setMonth(now.getMonth() - 2);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          previousStartDate.setMonth(now.getMonth() - 6);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          previousStartDate.setFullYear(now.getFullYear() - 2);
          break;
      }

      // Base where condition to filter by user's properties
      const baseWhere = {
        property: {
          userId: ctx.session.user.id,
        },
        ...(propertyId ? { propertyId } : {}),
      };

      // Calculate total revenue (rent payments + other income)
      const totalRevenue = await prisma.payment.aggregate({
        where: {
          ...baseWhere,
          createdAt: {
            gte: startDate,
          },
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
        },
      });

      // Calculate total expenses
      const totalExpenses = await prisma.expense.aggregate({
        where: {
          ...baseWhere,
          createdAt: {
            gte: startDate,
          },
        },
        _sum: {
          amount: true,
        },
      });

      // Get monthly trend data
      const monthlyTrend = await getMonthlyTrend(propertyId, timeRange, ctx.session.user.id);

      return {
        totalRevenue: totalRevenue._sum.amount ?? 0,
        totalExpenses: totalExpenses._sum.amount ?? 0,
        monthlyTrend,
      };
    }),
});

async function getMonthlyTrend(
  propertyId: string | undefined,
  timeRange: 'month' | 'quarter' | 'year',
  userId: string
) {
  const now = new Date();
  const periods = timeRange === 'month' ? 30 : timeRange === 'quarter' ? 90 : 12;
  const trend = [];

  // Base where condition to filter by user's properties
  const baseWhere = {
    property: {
      userId,
    },
    ...(propertyId ? { propertyId } : {}),
  };

  for (let i = 0; i < periods; i++) {
    const date = new Date();
    const endDate = new Date();

    if (timeRange === 'year') {
      date.setMonth(now.getMonth() - i);
      endDate.setMonth(now.getMonth() - i + 1);
    } else {
      date.setDate(now.getDate() - i);
      endDate.setDate(now.getDate() - i + 1);
    }

    // Get revenue for the period
    const revenue = await prisma.payment.aggregate({
      where: {
        ...baseWhere,
        createdAt: {
          gte: date,
          lt: endDate,
        },
        status: PaymentStatus.PAID,
      },
      _sum: {
        amount: true,
      },
    });

    // Get expenses for the period
    const expenses = await prisma.expense.aggregate({
      where: {
        ...baseWhere,
        createdAt: {
          gte: date,
          lt: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const month =
      timeRange === 'year'
        ? date.toLocaleDateString('en-US', { month: 'short' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    trend.push({
      month,
      revenue: revenue._sum.amount ?? 0,
      expenses: expenses._sum.amount ?? 0,
      profit: (revenue._sum.amount ?? 0) - (expenses._sum.amount ?? 0),
    });
  }

  // Return only the last 12 entries for year view, or all entries for other views
  return timeRange === 'year' ? trend.reverse() : trend.reverse().slice(0, 30);
}
