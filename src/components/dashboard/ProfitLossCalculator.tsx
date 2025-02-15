'use client';

import { api } from '@/lib/trpc/react';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface ProfitLossCalculatorProps {
  propertyId?: string;
}

interface MonthlyTrendItem {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  monthlyTrend: MonthlyTrendItem[];
}

export function ProfitLossCalculator({ propertyId }: ProfitLossCalculatorProps) {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');

  const { data: financialData, isLoading } = api.finance.getStats.useQuery({
    propertyId,
    timeRange,
  });

  if (isLoading) {
    return (
      <div className="h-[300px] rounded-lg bg-card p-6 shadow-sm">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const stats = {
    revenue: financialData?.totalRevenue ?? 0,
    expenses: financialData?.totalExpenses ?? 0,
    netProfit: (financialData?.totalRevenue ?? 0) - (financialData?.totalExpenses ?? 0),
    profitMargin: financialData?.totalRevenue
      ? ((financialData.totalRevenue - (financialData.totalExpenses ?? 0)) /
          financialData.totalRevenue) *
        100
      : 0,
  };

  // Calculate max value for chart scaling
  const maxMonthlyAmount = Math.max(
    ...(financialData?.monthlyTrend ?? []).map(item => Math.max(item.revenue, item.expenses))
  );

  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-card-foreground">Profit & Loss</h2>
        </div>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value as 'month' | 'quarter' | 'year')}
          className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
        >
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-accent/50 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-muted-foreground">Revenue</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-card-foreground">
            Rp {stats.revenue.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg bg-accent/50 p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <p className="text-sm font-medium text-muted-foreground">Expenses</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-card-foreground">
            Rp {stats.expenses.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg bg-accent/50 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-card-foreground">
            Rp {stats.netProfit.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg bg-accent/50 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-card-foreground">
            {stats.profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="mt-6">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">Monthly Trend</h3>
        <div className="h-[200px] w-full">
          <div className="flex h-full items-end gap-2">
            {financialData?.monthlyTrend?.map((item: MonthlyTrendItem, index: number) => (
              <div key={index} className="group relative flex-1">
                <div className="relative h-full">
                  {/* Revenue bar */}
                  <div
                    style={{ height: `${(item.revenue / maxMonthlyAmount) * 100}%` }}
                    className="absolute bottom-0 w-full rounded-t bg-green-200 transition-all duration-300 group-hover:bg-green-300"
                  />
                  {/* Expense bar */}
                  <div
                    style={{ height: `${(item.expenses / maxMonthlyAmount) * 100}%` }}
                    className="absolute bottom-0 w-full rounded-t bg-red-200 opacity-70 transition-all duration-300 group-hover:bg-red-300"
                  />
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">
                  {item.month}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-200" />
            <span className="text-xs text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-200" />
            <span className="text-xs text-muted-foreground">Expenses</span>
          </div>
        </div>
      </div>
    </div>
  );
}
