"use client";

import { OccupancyWidget } from "@/components/dashboard/OccupancyWidget";
import { InvoiceStatusBoard } from "@/components/dashboard/InvoiceStatusBoard";
import { ProfitLossCalculator } from "@/components/dashboard/ProfitLossCalculator";
import { api } from "@/lib/trpc/react";

export default function DashboardPage() {
  const { data, isLoading } = api.property.list.useQuery({});

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const properties = data?.properties ?? [];
  const totalProperties = properties.length;
  const totalRooms = properties.reduce((acc: number, property) => acc + (property.rooms?.length ?? 0), 0);
  const totalTenants = properties.reduce((acc: number, property) => acc + (property.rooms?.reduce((roomAcc: number, room) => roomAcc + (room.tenants?.length ?? 0), 0) ?? 0), 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>

      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Properties</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalProperties}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Rooms</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalRooms}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Tenants</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalTenants}</p>
        </div>
      </div>

      <div className="mb-8">
        <OccupancyWidget />
      </div>

      <div className="mb-8">
        <ProfitLossCalculator />
      </div>

      <div className="mb-8">
        <InvoiceStatusBoard />
      </div>
    </div>
  );
}
