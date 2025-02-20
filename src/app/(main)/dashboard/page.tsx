'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { api } from '@/lib/trpc/react';
import { AlertTriangle, ChevronDown, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
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
    <div className="relative h-full min-h-[400px] overflow-hidden rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg bg-muted"></div>
        <div className="h-7 w-48 rounded bg-muted"></div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted"></div>
        ))}
      </div>
      <div className="mt-4 h-[200px] rounded-lg bg-muted"></div>
    </div>
  );
}

// Optimized loading spinner
function LoadingSpinner() {
  return (
    <div className="flex h-[200px] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
    <div className="mb-6 space-y-4">
      {!isVerified && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/15 p-4 text-warning">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t('dashboard.businessNotVerified')}</p>
            <p className="text-xs">{t('dashboard.completeVerification')}</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/15 p-4 text-destructive">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t('dashboard.loadDataError')}</p>
            <p className="text-xs">{t('dashboard.refreshPage')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t('dashboard.title')}
          </h1>
          <p className="mt-2 text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        {properties.length > 0 && (
          <div className="relative w-full sm:w-[200px]">
            <select
              value={selectedPropertyId}
              onChange={e => onPropertyChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-input bg-card px-4 py-2 pr-10 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t('dashboard.allProperties')}</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        )}
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
    <div className="flex flex-col gap-6">
      <div className="w-full rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <OccupancyWidget key={selectedPropertyId} propertyId={selectedPropertyId} />
      </div>

      <div className="w-full rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <MonthlyTrendChart key={selectedPropertyId} propertyId={selectedPropertyId} />
      </div>

      <div className="w-full rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <MaintenanceTracker key={selectedPropertyId} propertyId={selectedPropertyId} />
      </div>

      <div className="w-full rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
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

  // If there's an error fetching properties, show the error boundary
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
    <div className="container mx-auto min-h-screen px-4 py-8">
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
  );
}
