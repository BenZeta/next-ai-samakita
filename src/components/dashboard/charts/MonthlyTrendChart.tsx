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
import { useTranslations } from 'use-intl';

interface MonthlyTrendItem {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

// Format number to Rupiah
const formatToRupiah = (value: number) => {
  return `Rp ${value.toLocaleString('id-ID')}`;
};

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
  const t = useTranslations('dashboard.widgets.monthlyTrend');
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg bg-background p-3 shadow-lg ring-1 ring-black/5">
      <p className="font-medium">{payload[0]?.payload?.month}</p>
      {payload.map((item: any, index: number) => (
        <p key={index} className="text-sm text-muted-foreground">
          {t(item.name.toLowerCase())}: {formatToRupiah(item.value)}
        </p>
      ))}
    </div>
  );
});

interface MonthlyTrendChartProps {
  data: MonthlyTrendItem[];
  timeRange?: string;
}

const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  data = [],
  timeRange = 'month',
}) => {
  const t = useTranslations();

  // Ensure data is not empty to prevent layout shifts
  const chartData =
    data.length > 0 ? data : [{ month: 'No data', revenue: 0, expenses: 0, profit: 0 }];

  // Calculate max value for better y-axis scaling
  const maxValue = Math.max(
    ...chartData.map(item => Math.max(item.revenue, item.expenses, item.profit))
  );
  // Round up to nearest million and add 10% padding
  const yAxisMax = Math.max(1000000, Math.ceil((maxValue * 1.2) / 1000000) * 1000000);

  return (
    <div style={{ width: '100%', minHeight: '300px', position: 'relative' }}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <ChartGradients />
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            height={40}
            interval="preserveStartEnd"
            tickMargin={10}
          />
          <YAxis
            tickFormatter={value => formatToRupiah(Number(value))}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            width={120}
            domain={[0, yAxisMax]}
            tickMargin={10}
            scale="linear"
            allowDataOverflow={false}
            minTickGap={20}
          />
          <Tooltip
            content={props => <ChartTooltip {...props} />}
            cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: '4px' }}
            formatter={(value: string) => t(value.toLowerCase())}
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
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
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
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default memo(MonthlyTrendChart);
