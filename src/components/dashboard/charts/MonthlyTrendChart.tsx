'use client';

import { useTheme } from 'next-themes';
import { memo, useEffect, useState } from 'react';
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
const ChartGradients = () => (
  <defs>
    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
    </linearGradient>
    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
    </linearGradient>
  </defs>
);

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
  const t = useTranslations('dashboard.widgets.monthlyTrend');
  const { resolvedTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Initial check
    checkMobile();

    // Add event listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Ensure data is not empty to prevent layout shifts
  const chartData =
    data.length > 0 ? data : [{ month: 'No data', revenue: 0, expenses: 0, profit: 0 }];

  // Calculate max value for better y-axis scaling
  const maxValue = Math.max(
    ...chartData.map(item => Math.max(item.revenue, item.expenses, item.profit))
  );
  // Round up to nearest million and add 10% padding
  const yAxisMax = Math.max(1000000, Math.ceil((maxValue * 1.2) / 1000000) * 1000000);

  const formatCurrency = (value: number) => {
    if (isMobile && value > 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    return `Rp ${value.toLocaleString()}`;
  };

  const formatMonth = (month: string) => {
    if (isMobile) {
      // For mobile, show shorter month names
      const parts = month.split(' ');
      if (parts.length === 2) {
        // If format is "January 2024", return "Jan"
        return parts[0].slice(0, 3);
      }
    }
    return month;
  };

  // Calculate appropriate interval based on data length and screen size
  const getInterval = () => {
    if (isMobile) {
      if (chartData.length > 6) return Math.ceil(chartData.length / 6);
      return 0;
    }
    return 'preserveStartEnd';
  };

  return (
    <div className="h-[300px] w-full sm:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{
            top: 20,
            right: isMobile ? 5 : 30,
            left: isMobile ? -15 : 0,
            bottom: isMobile ? 0 : 20,
          }}
        >
          <ChartGradients />
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            tick={{
              fontSize: isMobile ? 10 : 12,
              fill: resolvedTheme === 'dark' ? '#94a3b8' : '#64748b',
            }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            height={isMobile ? 30 : 40}
            interval={getInterval()}
            tickMargin={isMobile ? 5 : 10}
            angle={isMobile ? -45 : 0}
            textAnchor={isMobile ? 'end' : 'middle'}
            dy={isMobile ? 10 : 0}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{
              fontSize: isMobile ? 10 : 12,
              fill: resolvedTheme === 'dark' ? '#94a3b8' : '#64748b',
            }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            width={isMobile ? 50 : 120}
            domain={[0, yAxisMax]}
            tickMargin={isMobile ? 2 : 10}
            scale="linear"
            allowDataOverflow={false}
            minTickGap={isMobile ? 15 : 20}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#ffffff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: isMobile ? '12px' : '14px',
              padding: isMobile ? '8px' : '12px',
            }}
            itemStyle={{
              padding: isMobile ? '2px 0' : '4px 0',
            }}
            formatter={(value: number) => [formatCurrency(value)]}
            labelStyle={{
              color: resolvedTheme === 'dark' ? '#94a3b8' : '#64748b',
              marginBottom: isMobile ? '4px' : '8px',
            }}
          />
          <Legend
            verticalAlign="top"
            height={isMobile ? 24 : 36}
            iconType="circle"
            iconSize={isMobile ? 6 : 8}
            wrapperStyle={{
              paddingTop: isMobile ? '2px' : '4px',
              fontSize: isMobile ? '10px' : '12px',
            }}
            formatter={(value: string) => t(value.toLowerCase())}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#6366f1"
            strokeWidth={isMobile ? 1.5 : 2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: isMobile ? 4 : 6, strokeWidth: isMobile ? 1 : 2 }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="#f43f5e"
            strokeWidth={isMobile ? 1.5 : 2}
            fillOpacity={1}
            fill="url(#colorExpenses)"
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: isMobile ? 4 : 6, strokeWidth: isMobile ? 1 : 2 }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke="#10b981"
            strokeWidth={isMobile ? 1.5 : 2}
            dot={false}
            activeDot={{ r: isMobile ? 4 : 6, strokeWidth: isMobile ? 1 : 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default memo(MonthlyTrendChart);
