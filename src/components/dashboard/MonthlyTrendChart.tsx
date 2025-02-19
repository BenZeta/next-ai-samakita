'use client';

import { api } from '@/lib/trpc/react';
import { DollarSign } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo, useMemo, useState } from 'react';

// Dynamically import heavy chart component
const Chart = dynamic(() => import('./charts/MonthlyTrendChart').then(mod => mod.default), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

interface MonthlyTrendChartProps {
  propertyId?: string;
}

interface MonthlyTrendItem {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

// Loading skeleton for chart
function ChartSkeleton() {
  return <div className="h-[400px] w-full animate-pulse rounded-lg bg-muted" />;
}

// Stats display component to reduce re-renders
const StatsDisplay = memo(function StatsDisplay({
  summary,
}: {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
}) {
  return (
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
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted"></div>
          <div className="h-7 w-48 animate-pulse rounded bg-muted"></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted"></div>
          ))}
        </div>
        <div className="h-[400px] animate-pulse rounded-lg bg-muted"></div>
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

      <StatsDisplay summary={summary} />

      <div className="mt-6">
        <Chart data={financeData.monthlyTrend} />
      </div>
    </div>
  );
}

export default memo(MonthlyTrendChart);
