'use client';

import { MaintenanceTracker } from '@/components/dashboard/MaintenanceTracker';
import { MonthlyTrendChart } from '@/components/dashboard/MonthlyTrendChart';
import { OccupancyWidget } from '@/components/dashboard/OccupancyWidget';
import { TenantOverview } from '@/components/dashboard/TenantOverview';
import { api } from '@/lib/trpc/react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function DashboardPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>();
  const { data: session } = useSession();
  const isVerified = (session as any)?.token?.businessVerified === true;

  const { data: propertyData, isLoading: propertiesLoading } = api.property.list.useQuery(
    {
      page: 1,
      limit: 100,
    },
    {
      enabled: isVerified, // Only fetch if verified
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
        {isVerified && (
          <div className="relative">
            <select
              value={selectedPropertyId}
              onChange={e => setSelectedPropertyId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-input bg-background px-4 py-2 pr-10 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
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

      {!isVerified ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Business Verification Required
            </h3>
          </div>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>
              Please complete the business verification process to access all dashboard features.
              This includes property management, tenant tracking, and financial analytics.
            </p>
            <Link
              href="/business-verification"
              className="mt-2 inline-flex items-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white hover:bg-yellow-500"
            >
              Complete Verification
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          <OccupancyWidget propertyId={selectedPropertyId} />
          <MonthlyTrendChart propertyId={selectedPropertyId} />
          <MaintenanceTracker propertyId={selectedPropertyId} />
          <TenantOverview propertyId={selectedPropertyId} />
        </div>
      )}
    </div>
  );
}
