'use client';

import { api } from '@/lib/trpc/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
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

export function MonthlyTrendChart({ propertyId }: MonthlyTrendChartProps) {
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

  // Format currency in a more compact way
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  // Get the last 7 data points to show in the chart
  const recentData = financialData?.monthlyTrend?.slice(-7) ?? [];

  // Calculate summary statistics
  const totalRevenue = recentData.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpenses = recentData.reduce((sum, item) => sum + item.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
          <p className="mb-2 font-medium text-foreground">{label}</p>
          <p className="text-sm text-green-600">Revenue: Rp {formatCurrency(payload[0].value)}</p>
          <p className="text-sm text-red-600">Expenses: Rp {formatCurrency(payload[1].value)}</p>
          <p className="mt-1 text-sm font-medium text-blue-600">
            Profit: Rp {formatCurrency(payload[0].value - payload[1].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold text-card-foreground">Monthly Trend</h3>
          <div className="relative">
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value as 'month' | 'quarter' | 'year')}
              className="appearance-none rounded-lg border border-input bg-background px-3 py-1.5 pr-8 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-accent/50 p-4">
          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            Rp {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="rounded-lg bg-accent/50 p-4">
          <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
          <p className="mt-2 text-2xl font-bold text-red-600">Rp {formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-lg bg-accent/50 p-4">
          <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">Rp {formatCurrency(totalProfit)}</p>
        </div>
        <div className="rounded-lg bg-accent/50 p-4">
          <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
          <p className="mt-2 text-2xl font-bold text-primary">{profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="mt-6 h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={recentData}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
              tickFormatter={value => `Rp ${formatCurrency(value)}`}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <Tooltip content={CustomTooltip} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#22c55e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorExpenses)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-sm text-muted-foreground">Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-sm text-muted-foreground">Expenses</span>
        </div>
      </div>
    </div>
  );
}
