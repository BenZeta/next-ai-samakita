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
      let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // Include today

      switch (timeRange) {
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Base where condition for expenses
      const expenseWhere = propertyId
        ? {
            // Property-specific expenses
            propertyId,
            property: { userId: ctx.session.user.id },
          }
        : {
            // All expenses (property-specific and general)
            OR: [
              { property: { userId: ctx.session.user.id } },
              { userId: ctx.session.user.id, propertyId: null },
            ],
          };

      // Base where condition for revenue
      const revenueWhere = propertyId
        ? {
            tenant: { room: { propertyId, property: { userId: ctx.session.user.id } } },
          }
        : {
            tenant: { room: { property: { userId: ctx.session.user.id } } },
          };

      // Calculate total revenue (rent payments + other income)
      const totalRevenue = await prisma.payment.aggregate({
        where: {
          ...revenueWhere,
          createdAt: {
            gte: startDate,
            lt: endDate,
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
          ...expenseWhere,
          createdAt: {
            gte: startDate,
            lt: endDate,
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
  const trend = [];

  // Base where conditions
  const expenseWhere = propertyId
    ? {
        // Property-specific expenses
        propertyId,
        property: { userId },
      }
    : {
        // All expenses (property-specific and general)
        OR: [{ property: { userId } }, { userId, propertyId: null }],
      };

  const revenueWhere = propertyId
    ? {
        tenant: { room: { propertyId, property: { userId } } },
      }
    : {
        tenant: { room: { property: { userId } } },
      };

  // Determine number of periods and interval type
  const periods = timeRange === 'month' ? 30 : timeRange === 'quarter' ? 3 : 12;
  const isMonthly = timeRange === 'year' || timeRange === 'quarter';

  for (let i = 0; i < periods; i++) {
    const date = new Date();
    const endDate = new Date();

    if (isMonthly) {
      date.setMonth(now.getMonth() - i);
      endDate.setMonth(now.getMonth() - i + 1);
    } else {
      date.setDate(now.getDate() - i);
      endDate.setDate(now.getDate() - i + 1);
    }

    // Set hours to start and end of day
    date.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Get revenue for the period
    const revenue = await prisma.payment.aggregate({
      where: {
        ...revenueWhere,
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
        ...expenseWhere,
        createdAt: {
          gte: date,
          lt: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const month = isMonthly
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
  return timeRange === 'year' ? trend.reverse() : trend.reverse().slice(0, periods);
}
