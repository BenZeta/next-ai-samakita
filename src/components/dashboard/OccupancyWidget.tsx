'use client';

import { api } from '@/lib/trpc/react';
import { ArrowDown, ArrowUp, Building } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

// Dynamically import heavy chart components
const Chart = dynamic(() => import('./charts/OccupancyChart').then(mod => mod.default), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

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

// Loading skeleton for chart
function ChartSkeleton() {
  return <div className="h-[200px] w-full animate-pulse rounded-lg bg-muted" />;
}

// Stats display component to reduce re-renders
const StatsDisplay = memo(function StatsDisplay({
  occupancyData,
  rateDifference,
  timeRange,
}: {
  occupancyData: OccupancyData;
  rateDifference: string;
  timeRange: string;
}) {
  const t = useTranslations();
  
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg bg-accent/50 p-4">
        <p className="text-sm font-medium text-muted-foreground">{t('dashboard.currentRate')}</p>
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
          <span className="text-muted-foreground">
            {t('dashboard.timeRange.vsPrevious')} {timeRange}
          </span>
        </div>
      </div>

      {occupancyData.roomStatusBreakdown.map(status => (
        <div key={status.status} className="rounded-lg bg-accent/50 p-4">
          <p className="text-sm font-medium text-muted-foreground">{status.status}</p>
          <p className="mt-1 text-2xl font-semibold">{status.occupancyRate.toFixed(2)}%</p>
        </div>
      ))}
    </div>
  );
});

function OccupancyWidget({ propertyId }: OccupancyWidgetProps) {
  const t = useTranslations();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  const { data: occupancyData, isLoading } = api.room.getOccupancyStats.useQuery(
    {
      propertyId,
      timeRange,
    },
    {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    }
  );

  // Memoize the rate difference calculation
  const rateDifference = useMemo(() => {
    if (!occupancyData) return '0';
    return (occupancyData.currentRate - occupancyData.previousRate).toFixed(2);
  }, [occupancyData]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted"></div>
          <div className="h-7 w-48 animate-pulse rounded bg-muted"></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted"></div>
          ))}
        </div>
        <div className="h-[200px] animate-pulse rounded-lg bg-muted"></div>
      </div>
    );
  }

  if (!occupancyData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {t('dashboard.noOccupancyData')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[400px] flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Building className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{t('dashboard.occupancyRate')}</h2>
        </div>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="week">{t('dashboard.timeRange.thisWeek')}</option>
          <option value="month">{t('dashboard.timeRange.thisMonth')}</option>
          <option value="year">{t('dashboard.timeRange.thisYear')}</option>
        </select>
      </div>

      <StatsDisplay
        occupancyData={occupancyData}
        rateDifference={rateDifference}
        timeRange={timeRange}
      />

      <div className="mt-auto h-[200px] w-full">
        <Chart data={occupancyData.history} />
      </div>
    </div>
  );
}

export default memo(OccupancyWidget);
