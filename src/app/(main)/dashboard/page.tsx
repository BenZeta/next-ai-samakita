'use client';

import { api } from '@/lib/trpc/react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Suspense, lazy, useState } from 'react';

// Lazy load heavy components
const MaintenanceTracker = lazy(() => import('@/components/dashboard/MaintenanceTracker'));
const MonthlyTrendChart = lazy(() => import('@/components/dashboard/MonthlyTrendChart'));
const OccupancyWidget = lazy(() => import('@/components/dashboard/OccupancyWidget'));
const TenantOverview = lazy(() => import('@/components/dashboard/TenantOverview'));

// Loading component with shimmer effect
function WidgetSkeleton() {
  return (
    <div className="relative h-[300px] overflow-hidden rounded-lg border border-border bg-card p-6">
      <div className="animate-pulse">
        <div className="h-6 w-1/3 rounded bg-muted"></div>
        <div className="mt-4 space-y-3">
          <div className="h-4 w-3/4 rounded bg-muted"></div>
          <div className="h-4 w-1/2 rounded bg-muted"></div>
        </div>
      </div>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
    </div>
  );
}

export default function DashboardPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>();
  const { data: session } = useSession();
  const isVerified = session?.token?.businessVerified === true;

  const { data: propertyData, isLoading: propertiesLoading } = api.property.list.useQuery(
    {
      page: 1,
      limit: 100,
    },
    {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    }
  );

  if (propertiesLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const properties = propertyData?.properties ?? [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor your properties performance and occupancy in real-time
          </p>
        </div>
        {properties.length > 0 && (
          <div className="relative">
            <select
              value={selectedPropertyId}
              onChange={e => setSelectedPropertyId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-input bg-card px-4 py-2 pr-10 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
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

      {!isVerified && (
        <div className="mb-6 rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-4 dark:border-yellow-400/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Business Verification Required
            </h3>
          </div>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>
              Please complete the business verification process to perform actions like adding
              properties, managing tenants, and handling payments.
            </p>
            <Link
              href="/business-verification"
              className="mt-2 inline-flex items-center rounded-md bg-yellow-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-yellow-400 dark:bg-yellow-400/20 dark:text-yellow-200 dark:hover:bg-yellow-400/30"
            >
              Complete Verification
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        <Suspense fallback={<WidgetSkeleton />}>
          <div className="rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <OccupancyWidget propertyId={selectedPropertyId} />
          </div>
        </Suspense>

        <Suspense fallback={<WidgetSkeleton />}>
          <div className="rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <MonthlyTrendChart propertyId={selectedPropertyId} />
          </div>
        </Suspense>

        <Suspense fallback={<WidgetSkeleton />}>
          <div className="rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <MaintenanceTracker propertyId={selectedPropertyId} />
          </div>
        </Suspense>

        <Suspense fallback={<WidgetSkeleton />}>
          <div className="rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <TenantOverview propertyId={selectedPropertyId} />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
