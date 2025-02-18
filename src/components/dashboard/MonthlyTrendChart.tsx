'use client';

import { api } from '@/lib/trpc/react';
import { DollarSign } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MonthlyTrendChartProps {
  propertyId?: string;
}

interface MonthlyTrendItem {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

// Memoized chart component
const TrendChart = memo(function TrendChart({ data }: { data: MonthlyTrendItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={value => `Rp ${(value / 1000000).toFixed(1)}M`}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
          domain={[0, 'auto']}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const data = payload[0]?.payload as MonthlyTrendItem;
            if (!data) return null;
            return (
              <div className="rounded-lg bg-background p-3 shadow-lg ring-1 ring-black/5">
                <p className="mb-1 font-medium">{data.month}</p>
                <div className="space-y-1">
                  <p className="text-sm text-green-500">
                    Revenue: Rp {data.revenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-red-500">
                    Expenses: Rp {data.expenses.toLocaleString()}
                  </p>
                  <p className="text-sm text-primary">Profit: Rp {data.profit.toLocaleString()}</p>
                </div>
              </div>
            );
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#22c55e"
          fill="url(#colorRevenue)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke="#ef4444"
          fill="url(#colorExpenses)"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="profit"
          name="Profit"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ fill: '#6366f1', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});

function MonthlyTrendChart({ propertyId }: MonthlyTrendChartProps) {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');

  const { data: financeData, isLoading } = api.finance.getStats.useQuery(
    {
      propertyId,
      timeRange,
    },
    {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    }
  );

  // Memoize summary calculations
  const summary = useMemo(() => {
    if (!financeData) return null;
    return {
      totalRevenue: financeData.totalRevenue,
      totalExpenses: financeData.totalExpenses,
      netProfit: financeData.totalRevenue - financeData.totalExpenses,
      profitMargin: financeData.totalRevenue
        ? ((financeData.totalRevenue - financeData.totalExpenses) / financeData.totalRevenue) * 100
        : 0,
    };
  }, [financeData]);

  if (isLoading) {
    return (
      <div className="h-[400px] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (!financeData || !summary) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            No financial data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Monthly Trend</h2>
        </div>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value as 'month' | 'quarter' | 'year')}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-accent/50 p-4">
          <p className="text-sm font-medium text-muted-foreground">Revenue</p>
          <p className="mt-1 text-xl font-bold">Rp {summary.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-accent/50 p-4">
          <p className="text-sm font-medium text-muted-foreground">Expenses</p>
          <p className="mt-1 text-xl font-bold">Rp {summary.totalExpenses.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-accent/50 p-4">
          <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
          <p className="mt-1 text-xl font-bold">Rp {summary.netProfit.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-accent/50 p-4">
          <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
          <p className="mt-1 text-xl font-bold">{summary.profitMargin.toFixed(2)}%</p>
        </div>
      </div>

      <div className="mt-6">
        <TrendChart data={financeData.monthlyTrend} />
      </div>
    </div>
  );
}

export default memo(MonthlyTrendChart);
