'use client';

import { api } from '@/lib/trpc/react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

// Constants for fixed dimensions to prevent layout shifts
const DIMENSIONS = {
  widget: {
    height: 400,
    headerHeight: 40,
    statsHeight: 96,
    chartHeight: 200,
  },
  header: {
    height: 120,
    alertHeight: 72,
    titleHeight: 64,
  },
} as const;

// Pre-load the most important widget first with placeholder
const OccupancyWidget = dynamic(() => import('@/components/dashboard/OccupancyWidget'), {
  loading: () => (
    <div style={{ height: DIMENSIONS.widget.height }}>
      <WidgetSkeleton />
    </div>
  ),
  ssr: false,
});

// Lazy load other widgets with placeholders
const MonthlyTrendChart = dynamic(() => import('@/components/dashboard/MonthlyTrendChart'), {
  loading: () => (
    <div style={{ height: DIMENSIONS.widget.height }}>
      <WidgetSkeleton />
    </div>
  ),
  ssr: false,
});

const MaintenanceTracker = dynamic(() => import('@/components/dashboard/MaintenanceTracker'), {
  loading: () => (
    <div style={{ height: DIMENSIONS.widget.height }}>
      <WidgetSkeleton />
    </div>
  ),
  ssr: false,
});

const TenantOverview = dynamic(() => import('@/components/dashboard/TenantOverview'), {
  loading: () => (
    <div style={{ height: DIMENSIONS.widget.height }}>
      <WidgetSkeleton />
    </div>
  ),
  ssr: false,
});

// Optimized skeleton with fixed dimensions
function WidgetSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border bg-card p-6"
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateRows: `${DIMENSIONS.widget.headerHeight}px ${DIMENSIONS.widget.statsHeight}px ${DIMENSIONS.widget.chartHeight}px`,
        gap: '1rem',
      }}
    >
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg bg-muted"></div>
        <div className="h-7 w-48 rounded bg-muted"></div>
      </div>
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        style={{ height: DIMENSIONS.widget.statsHeight }}
      >
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-full rounded-lg bg-muted"></div>
        ))}
      </div>
      <div className="rounded-lg bg-muted" style={{ height: DIMENSIONS.widget.chartHeight }}></div>
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
  return (
    <div
      style={{
        height: DIMENSIONS.header.height,
        display: 'grid',
        gridTemplateRows: isVerified ? '1fr' : `${DIMENSIONS.header.alertHeight}px 1fr`,
        gap: '1.5rem',
      }}
    >
      {!isVerified && (
        <div
          className="flex items-center gap-2 rounded-lg bg-warning/15 p-4 text-warning"
          style={{ height: DIMENSIONS.header.alertHeight }}
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Your business is not verified yet</p>
            <p className="text-xs">
              Please{' '}
              <Link href="/settings/business" className="font-medium underline">
                complete your business verification
              </Link>{' '}
              to access all features.
            </p>
          </div>
        </div>
      )}

      {isError && (
        <div
          className="flex items-center gap-2 rounded-lg bg-destructive/15 p-4 text-destructive"
          style={{ height: DIMENSIONS.header.alertHeight }}
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Failed to load property data</p>
            <p className="text-xs">Please try refreshing the page</p>
          </div>
        </div>
      )}

      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ height: DIMENSIONS.header.titleHeight }}
      >
        <div style={{ height: '100%' }}>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor your properties performance and occupancy in real-time
          </p>
        </div>
        {properties.length > 0 && (
          <div style={{ width: '200px', height: '40px' }}>
            <select
              value={selectedPropertyId}
              onChange={e => onPropertyChange(e.target.value)}
              className="h-full w-full appearance-none rounded-lg border border-input bg-card px-4 pr-10 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Properties</option>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Delay mounting to ensure proper hydration
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Pre-render skeleton with fixed dimensions
  if (!mounted) {
    return (
      <div
        className="grid gap-6"
        style={{
          gridTemplateRows: `repeat(4, ${DIMENSIONS.widget.height}px)`,
        }}
      >
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ height: DIMENSIONS.widget.height }}>
            <WidgetSkeleton />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid gap-6"
      style={{
        gridTemplateRows: `repeat(4, ${DIMENSIONS.widget.height}px)`,
      }}
    >
      <div className="rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <OccupancyWidget key={selectedPropertyId} propertyId={selectedPropertyId} />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <MonthlyTrendChart key={selectedPropertyId} propertyId={selectedPropertyId} />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <MaintenanceTracker key={selectedPropertyId} propertyId={selectedPropertyId} />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <TenantOverview key={selectedPropertyId} propertyId={selectedPropertyId} />
      </div>
    </div>
  );
});

export default function DashboardPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>();
  const { data: session } = useSession();
  const isVerified = session?.token?.businessVerified === true;

  // Memoize property query options with aggressive caching
  const propertyQueryOptions = useMemo(
    () => ({
      staleTime: 60000,
      cacheTime: 3600000,
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: 1000,
      keepPreviousData: true,
      suspense: false, // Disable suspense to prevent layout shifts
    }),
    []
  );

  // Optimized property query with error handling
  const {
    data: propertyData,
    isLoading: propertiesLoading,
    isError: propertiesError,
  } = api.property.list.useQuery(
    {
      page: 1,
      limit: 100,
    },
    propertyQueryOptions
  );

  const properties = propertyData?.properties ?? [];

  // Memoize property change handler
  const handlePropertyChange = useCallback((id: string) => {
    setSelectedPropertyId(id);
  }, []);

  return (
    <div
      className="container mx-auto px-4 py-8"
      style={{
        minHeight: 'calc(100vh - 4rem)',
        display: 'grid',
        gridTemplateRows: `${DIMENSIONS.header.height}px 1fr`,
        gap: '2rem',
      }}
    >
      <DashboardHeader
        isVerified={isVerified}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onPropertyChange={handlePropertyChange}
        isError={propertiesError}
      />

      {propertiesLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateRows: `${DIMENSIONS.widget.height}px`,
          }}
        >
          <WidgetSkeleton />
        </div>
      ) : (
        <DashboardContent selectedPropertyId={selectedPropertyId} />
      )}
    </div>
  );
}
