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
    <div className="mb-6 space-y-4">
      {!isVerified && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/15 p-4 text-warning">
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
        <div className="flex items-center gap-2 rounded-lg bg-destructive/15 p-4 text-destructive">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Failed to load property data</p>
            <p className="text-xs">Please try refreshing the page</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Monitor your properties performance and occupancy in real-time
          </p>
        </div>
        {properties.length > 0 && (
          <div className="relative w-full sm:w-[200px]">
            <select
              value={selectedPropertyId}
              onChange={e => onPropertyChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-input bg-card px-4 py-2 pr-10 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
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
      <div className="flex flex-col gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-full">
            <WidgetSkeleton />
          </div>
        ))}
      </div>
    );
  }

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

  // Memoize property query options with aggressive caching
  const propertyQueryOptions = useMemo(
    () => ({
      staleTime: 60000,
      cacheTime: 3600000,
      refetchOnWindowFocus: false,
      retry: 3,
    }),
    []
  );

  const { data: properties, isError } = api.property.list.useQuery(
    {
      page: 1,
      limit: 100,
    },
    propertyQueryOptions
  );

  const handlePropertyChange = useCallback((id: string) => {
    setSelectedPropertyId(id || undefined);
  }, []);

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      <DashboardHeader
        isVerified={isVerified}
        properties={properties?.properties || []}
        selectedPropertyId={selectedPropertyId}
        onPropertyChange={handlePropertyChange}
        isError={isError}
      />
      <DashboardContent selectedPropertyId={selectedPropertyId} />
    </div>
  );
}
