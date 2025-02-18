'use client';

import { memo } from 'react';
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

interface MonthlyTrendItem {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

// Gradient definitions component to prevent re-renders
const ChartGradients = memo(function ChartGradients() {
  return (
    <defs>
      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
      </linearGradient>
    </defs>
  );
});

// Memoized tooltip to prevent re-renders
const ChartTooltip = memo(function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg bg-background p-3 shadow-lg ring-1 ring-black/5">
      <p className="font-medium">{payload[0]?.payload?.label}</p>
      {payload.map((item: any, index: number) => (
        <p key={index} className="text-sm text-muted-foreground">
          {item.name}: ${item.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
});

interface MonthlyTrendChartProps {
  data: MonthlyTrendItem[];
}

function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  // Ensure data is not empty to prevent layout shifts
  const chartData =
    data.length > 0 ? data : [{ month: 'No data', revenue: 0, expenses: 0, profit: 0 }];

  return (
    <div style={{ width: '100%', height: '200px', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <ChartGradients />
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            height={20}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={value => `$${Number(value).toLocaleString()}`}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            width={80}
            domain={['dataMin - 1000', 'dataMax + 1000']}
          />
          <Tooltip content={props => <ChartTooltip {...props} />} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: '4px' }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="#f43f5e"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorExpenses)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(MonthlyTrendChart);
