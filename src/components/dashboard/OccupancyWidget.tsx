'use client';

import { api } from '@/lib/trpc/react';
import { ArrowDown, ArrowUp, Building } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { memo, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface OccupancyWidgetProps {
  propertyId?: string;
}

interface OccupancyHistoryItem {
  label: string;
  rate: number;
}

interface RoomStatusBreakdown {
  status: string;
  occupancyRate: number;
}

interface OccupancyData {
  currentRate: number;
  previousRate: number;
  totalRooms: number;
  occupiedRooms: number;
  history: OccupancyHistoryItem[];
  roomStatusBreakdown: RoomStatusBreakdown[];
}

// Memoized chart component to prevent unnecessary re-renders
const OccupancyChart = memo(function OccupancyChart({ data }: { data: OccupancyHistoryItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={value => `${Number(value).toFixed(0)}%`}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const value = payload[0]?.value;
            if (typeof value !== 'number') return null;
            return (
              <div className="rounded-lg bg-background p-3 shadow-lg ring-1 ring-black/5">
                <p className="font-medium">{payload[0].payload.label}</p>
                <p className="text-sm text-muted-foreground">Occupancy: {value.toFixed(2)}%</p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="rate"
          stroke="#6366f1"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRate)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

function OccupancyWidget({ propertyId }: OccupancyWidgetProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const { data: session } = useSession();
  const isVerified = session?.token?.businessVerified === true;

  const { data: occupancyData, isLoading } = api.room.getOccupancyStats.useQuery(
    {
      propertyId,
      timeRange,
    },
    {
      staleTime: 30000, // Cache data for 30 seconds
      refetchOnWindowFocus: false, // Don't refetch on window focus
    }
  );

  // Memoize the rate difference calculation
  const rateDifference = useMemo(() => {
    if (!occupancyData) return 0;
    return (occupancyData.currentRate - occupancyData.previousRate).toFixed(2);
  }, [occupancyData]);

  if (isLoading) {
    return (
      <div className="h-[400px] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading occupancy data...</p>
        </div>
      </div>
    );
  }

  if (!occupancyData) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">No occupancy data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Building className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Occupancy Rate</h2>
        </div>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-accent/50 p-4">
          <p className="text-sm font-medium text-muted-foreground">Current Rate</p>
          <p className="mt-1 text-2xl font-semibold">{occupancyData.currentRate.toFixed(2)}%</p>
          <div className="mt-1 flex items-center gap-1 text-sm">
            {Number(rateDifference) > 0 ? (
              <ArrowUp className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-600" />
            )}
            <span className={Number(rateDifference) > 0 ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(Number(rateDifference))}%
            </span>
            <span className="text-muted-foreground">vs previous {timeRange}</span>
          </div>
        </div>

        {occupancyData.roomStatusBreakdown.map(status => (
          <div key={status.status} className="rounded-lg bg-accent/50 p-4">
            <p className="text-sm font-medium text-muted-foreground">{status.status}</p>
            <p className="mt-1 text-2xl font-semibold">{status.occupancyRate.toFixed(2)}%</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <OccupancyChart data={occupancyData.history} />
      </div>
    </div>
  );
}

export default memo(OccupancyWidget);
