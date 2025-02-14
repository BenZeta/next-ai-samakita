"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { OccupancyWidget } from "@/components/dashboard/OccupancyWidget";
import { ProfitLossCalculator } from "@/components/dashboard/ProfitLossCalculator";
import { MaintenanceTracker } from "@/components/dashboard/MaintenanceTracker";
import { TenantOverview } from "@/components/dashboard/TenantOverview";

export default function DashboardPage() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>();

  const { data: propertyData, isLoading: propertiesLoading } = api.property.list.useQuery({
    page: 1,
    limit: 100,
  });

  if (propertiesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const properties = propertyData?.properties ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <select
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
          <option value="">All Properties</option>
          {properties.map((property) => (
            <option
              key={property.id}
              value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <OccupancyWidget propertyId={selectedPropertyId} />
        <ProfitLossCalculator propertyId={selectedPropertyId} />
      </div>

      <div className="mt-8">
        <MaintenanceTracker propertyId={selectedPropertyId} />
      </div>

      <div className="mt-8">
        <TenantOverview propertyId={selectedPropertyId} />
      </div>
    </div>
  );
}
