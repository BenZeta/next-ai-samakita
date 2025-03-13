'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { api } from '@/lib/trpc/react';
import { AlertTriangle, Calendar, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { memo, Suspense, useCallback, useState } from 'react';
import { useTranslations } from 'use-intl';

// Constants for fixed dimensions to prevent layout shifts
const DIMENSIONS = {
  widget: {
    minHeight: 400,
    headerHeight: 40,
    statsHeight: 96,
    chartHeight: 200,
  },
  header: {
    minHeight: 120,
    alertHeight: 72,
    titleHeight: 64,
  },
} as const;

// Pre-load the most important widget first with placeholder
const OccupancyWidget = dynamic(() => import('@/components/dashboard/OccupancyWidget'), {
  loading: () => <WidgetSkeleton />,
  ssr: false,
});

// Lazy load other widgets with placeholders
const MonthlyTrendChart = dynamic(() => import('@/components/dashboard/MonthlyTrendChart'), {
  loading: () => <WidgetSkeleton />,
  ssr: false,
});

const MaintenanceTracker = dynamic(() => import('@/components/dashboard/MaintenanceTracker'), {
  loading: () => <WidgetSkeleton />,
  ssr: false,
});

const TenantOverview = dynamic(() => import('@/components/dashboard/TenantOverview'), {
  loading: () => <WidgetSkeleton />,
  ssr: false,
});

// Optimized skeleton with fixed dimensions
function WidgetSkeleton() {
  return (
    <div className="relative h-full min-h-[350px] overflow-hidden rounded-lg border border-border bg-card p-4 sm:min-h-[400px] sm:p-6">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-muted sm:h-10 sm:w-10"></div>
        <div className="h-6 w-36 rounded bg-muted sm:h-7 sm:w-48"></div>
      </div>
      <div className="mt-4 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted sm:h-24"></div>
        ))}
      </div>
      <div className="mt-4 h-[180px] rounded-lg bg-muted sm:h-[200px]"></div>
    </div>
  );
}

// Optimized loading spinner
function LoadingSpinner() {
  return (
    <div className="flex h-[180px] w-full items-center justify-center sm:h-[200px]">
      <Loader2 className="h-6 w-6 animate-spin text-primary sm:h-8 sm:w-8" />
    </div>
  );
}

// Header with fixed dimensions and placeholder
const DashboardHeader = memo(function DashboardHeader({
  isVerified,
  properties,
  selectedPropertyId,
  onPropertyChange,
  isError,
}: {
  isVerified: boolean;
  properties: any[];
  selectedPropertyId?: string;
  onPropertyChange: (id: string) => void;
  isError: boolean;
}) {
  const t = useTranslations();

  return (
    <div className="mb-4 space-y-3 sm:mb-6">
      {!isVerified && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/15 p-3 text-warning sm:p-4">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" />
          <div className="flex-1">
            <p className="text-xs font-medium sm:text-sm">{t('dashboard.businessNotVerified')}</p>
            <p className="text-xs sm:text-sm">{t('dashboard.completeVerification')}</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/15 p-3 text-destructive sm:p-4">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" />
          <div className="flex-1">
            <p className="text-xs font-medium sm:text-sm">{t('dashboard.loadDataError')}</p>
            <p className="text-xs sm:text-sm">{t('dashboard.refreshPage')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/calendar"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Calendar className="h-4 w-4" />
            {t('dashboard.calendar.title')}
          </Link>
          {properties.length > 0 && (
            <div className="w-full sm:w-[200px]">
              <select
                value={selectedPropertyId}
                onChange={e => onPropertyChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input bg-card px-3 py-2 pr-8 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('dashboard.allProperties')}</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Content with progressive loading and fixed dimensions
const DashboardContent = memo(function DashboardContent({
  selectedPropertyId,
}: {
  selectedPropertyId?: string;
}) {
  return (
    <div className="grid gap-3 sm:gap-4 md:gap-6">
      <div className="w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <OccupancyWidget key={selectedPropertyId} propertyId={selectedPropertyId} />
      </div>

      <div className="w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <MonthlyTrendChart key={selectedPropertyId} propertyId={selectedPropertyId} />
      </div>

      <div className="w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <MaintenanceTracker key={selectedPropertyId} propertyId={selectedPropertyId} />
      </div>

      <div className="w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <TenantOverview key={selectedPropertyId} propertyId={selectedPropertyId} />
      </div>
    </div>
  );
});

export default function DashboardPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>();
  const { data: session } = useSession();
  const isVerified = session?.token?.businessVerified === true;
  const t = useTranslations();

  const {
    data: properties,
    isError,
    error,
  } = api.property.list.useQuery(
    {
      page: 1,
      limit: 100,
    },
    {
      staleTime: 30000,
      refetchOnWindowFocus: false,
      retry: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    }
  );

  const handlePropertyChange = useCallback((id: string) => {
    setSelectedPropertyId(id || undefined);
  }, []);

  if (isError) {
    return (
      <ErrorBoundary
        error={new Error(error?.message || 'Failed to load dashboard')}
        reset={() => window.location.reload()}
      >
        <div />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen w-full px-2 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-[1600px]">
        <Suspense fallback={<LoadingSpinner />}>
          <DashboardHeader
            isVerified={isVerified}
            properties={properties?.properties || []}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={handlePropertyChange}
            isError={isError}
          />
          <DashboardContent selectedPropertyId={selectedPropertyId} />
        </Suspense>
      </div>
    </div>
  );
}
