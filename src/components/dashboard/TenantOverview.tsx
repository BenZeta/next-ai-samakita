'use client';

import { api } from '@/lib/trpc/react';
import { TenantStatus } from '@prisma/client';
import { Calendar, UserCheck, Users, UserX } from 'lucide-react';
import { useState } from 'react';

interface TenantOverviewProps {
  propertyId?: string;
}

interface TenantStats {
  total: number;
  active: number;
  inactive: number;
  upcomingMoveOuts: number;
}

interface TenantSummary {
  id: string;
  name: string;
  room: string;
  status: TenantStatus;
  leaseStart: string;
  leaseEnd: string;
  rent: number;
}

export function TenantOverview({ propertyId }: TenantOverviewProps) {
  const [view, setView] = useState<'all' | 'active' | 'inactive'>('all');

  const { data: tenantData, isLoading } = api.tenant.getOverview.useQuery({
    propertyId,
    status:
      view === 'all' ? undefined : view === 'active' ? TenantStatus.ACTIVE : TenantStatus.INACTIVE,
  });

  if (isLoading) {
    return (
      <div className="h-[400px] rounded-lg bg-card p-6 shadow-sm">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const stats: TenantStats = tenantData?.stats ?? {
    total: 0,
    active: 0,
    inactive: 0,
    upcomingMoveOuts: 0,
  };

  const tenants: TenantSummary[] = (tenantData?.tenants ?? []).map(tenant => ({
    id: tenant.id,
    name: tenant.name,
    room: tenant.room.number,
    status: tenant.status,
    leaseStart: (tenant.startDate ?? new Date()).toISOString(),
    leaseEnd: (tenant.endDate ?? new Date()).toISOString(),
    rent: tenant.rentAmount ?? 0,
  }));

  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-card-foreground">Tenant Overview</h2>
        </div>
        <select
          value={view}
          onChange={e => setView(e.target.value as typeof view)}
          className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
        >
          <option value="all">All Tenants</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-accent/50 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-card-foreground">{stats.total}</p>
        </div>

        <div className="rounded-lg bg-green-100/50 p-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-800">Active Tenants</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-900">{stats.active}</p>
        </div>

        <div className="rounded-lg bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">Inactive Tenants</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-destructive">{stats.inactive}</p>
        </div>

        <div className="rounded-lg bg-yellow-100/50 p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-800">Upcoming Move-outs</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-900">{stats.upcomingMoveOuts}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-muted-foreground sm:pl-0"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-medium text-muted-foreground"
                    >
                      Room
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-medium text-muted-foreground"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-medium text-muted-foreground"
                    >
                      Lease Period
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-medium text-muted-foreground"
                    >
                      Rent
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tenants.map(tenant => (
                    <tr key={tenant.id} className="group">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-card-foreground sm:pl-0">
                        {tenant.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                        {tenant.room}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tenant.status === TenantStatus.ACTIVE
                              ? 'bg-green-100 text-green-800'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                        {new Date(tenant.leaseStart).toLocaleDateString()} -{' '}
                        {new Date(tenant.leaseEnd).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                        Rp {tenant.rent.toLocaleString()}
                      </td>
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
