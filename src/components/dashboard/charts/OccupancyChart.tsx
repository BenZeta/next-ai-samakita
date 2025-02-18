'use client';

import { memo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface OccupancyHistoryItem {
  label: string;
  rate: number;
}

// Gradient definitions component to prevent re-renders
const ChartGradients = memo(function ChartGradients() {
  return (
    <defs>
      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
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
  const value = payload[0]?.value;
  if (typeof value !== 'number') return null;

  return (
    <div className="rounded-lg bg-background p-3 shadow-lg ring-1 ring-black/5">
      <p className="font-medium">{payload[0].payload.label}</p>
      <p className="text-sm text-muted-foreground">Occupancy: {value.toFixed(2)}%</p>
    </div>
  );
});

interface OccupancyChartProps {
  data: OccupancyHistoryItem[];
}

function OccupancyChart({ data }: OccupancyChartProps) {
  // Ensure data is not empty to prevent layout shifts
  const chartData = data.length > 0 ? data : [{ label: 'No data', rate: 0 }];

  return (
    <div style={{ width: '100%', height: '200px', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <ChartGradients />
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            height={20}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={value => `${Number(value).toFixed(0)}%`}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            width={40}
            domain={[0, 100]}
          />
          <Tooltip content={props => <ChartTooltip {...props} />} />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRate)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(OccupancyChart);
