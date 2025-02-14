"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { Users, UserCheck, UserX, Calendar } from "lucide-react";
import { TenantStatus } from "@prisma/client";

interface TenantOverviewProps {
  propertyId?: string;
}

interface TenantStats {
  total: number;
  active: number;
  inactive: number;
  upcomingMoveIns: number;
  upcomingMoveOuts: number;
}

interface TenantSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: TenantStatus;
  leaseStart: Date;
  leaseEnd: Date;
  roomNumber: string;
  rentAmount: number;
}

export function TenantOverview({ propertyId }: TenantOverviewProps) {
  const [view, setView] = useState<"all" | "active" | "inactive">("all");

  const { data: tenantData, isLoading } = api.tenant.getOverview.useQuery({
    propertyId,
    status: view === "all" ? undefined : view === "active" ? TenantStatus.ACTIVE : TenantStatus.INACTIVE,
  });

  if (isLoading) {
    return (
      <div className="h-[400px] rounded-lg bg-white p-6 shadow">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const stats: TenantStats = tenantData?.stats ?? {
    total: 0,
    active: 0,
    inactive: 0,
    upcomingMoveIns: 0,
    upcomingMoveOuts: 0,
  };

  const tenants: TenantSummary[] = tenantData?.tenants ?? [];

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-medium text-gray-900">Tenant Overview</h2>
        </div>
        <select
          value={view}
          onChange={(e) => setView(e.target.value as typeof view)}
          className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
          <option value="all">All Tenants</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-gray-400" />
            <p className="ml-2 text-sm font-medium text-gray-500">Total Tenants</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>

        <div className="rounded-lg bg-green-50 p-4">
          <div className="flex items-center">
            <UserCheck className="h-5 w-5 text-green-500" />
            <p className="ml-2 text-sm font-medium text-green-800">Active Tenants</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-green-900">{stats.active}</p>
        </div>

        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex items-center">
            <UserX className="h-5 w-5 text-red-500" />
            <p className="ml-2 text-sm font-medium text-red-800">Inactive Tenants</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-red-900">{stats.inactive}</p>
        </div>

        <div className="rounded-lg bg-blue-50 p-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-blue-500" />
            <p className="ml-2 text-sm font-medium text-blue-800">Upcoming Move-ins</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-blue-900">{stats.upcomingMoveIns}</p>
        </div>

        <div className="rounded-lg bg-yellow-50 p-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-yellow-500" />
            <p className="ml-2 text-sm font-medium text-yellow-800">Upcoming Move-outs</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-yellow-900">{stats.upcomingMoveOuts}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Room
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Lease Period
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Rent
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-0">
                        <div>
                          <div className="font-medium text-gray-900">{tenant.name}</div>
                          <div className="text-gray-500">{tenant.email}</div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{tenant.roomNumber}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tenant.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(tenant.leaseStart).toLocaleDateString()} - {new Date(tenant.leaseEnd).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">Rp {tenant.rentAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
