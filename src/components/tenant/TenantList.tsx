'use client';

import { api } from '@/lib/trpc/react';
import { TenantStatus } from '@prisma/client';
import { Search, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface TenantListProps {
  roomId?: string;
  showAddButton?: boolean;
}

export function TenantList({ roomId, showAddButton = true }: TenantListProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TenantStatus | 'all'>('all');

  const { data: tenants, isLoading } = api.tenant.list.useQuery({
    roomId,
    status: status === 'all' ? undefined : status,
    search: search || undefined,
  });

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const hasNoTenants = !tenants || tenants.length === 0;
  const hasNoResults = tenants?.length === 0 && (search || status !== 'all');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 rounded-md border border-input bg-background px-4 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as TenantStatus | 'all')}
            className="rounded-md border border-input bg-background px-4 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Status</option>
            {Object.values(TenantStatus).map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {showAddButton && roomId && (
          <Link
            href={`/rooms/${roomId}/tenants/new`}
            className="flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Add Tenant
          </Link>
        )}
      </div>

      {hasNoTenants ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border py-12">
          {hasNoResults ? (
            <>
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium text-foreground">No tenants found</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </>
          ) : (
            <>
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium text-foreground">No tenants yet</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Get started by adding your first tenant.
              </p>
              {showAddButton && roomId && (
                <Link
                  href={`/rooms/${roomId}/tenants/new`}
                  className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Add Tenant
                </Link>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {tenants?.map(tenant => (
                <tr key={tenant.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">{tenant.name}</div>
                    <div className="text-sm text-muted-foreground">{tenant.ktpNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">Room {tenant.room.number}</div>
                    <div className="text-sm text-muted-foreground">{tenant.room.property.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">{tenant.email}</div>
                    <div className="text-sm text-muted-foreground">{tenant.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {tenant.startDate
                        ? new Date(tenant.startDate).toLocaleDateString()
                        : 'Not set'}{' '}
                      - {tenant.endDate ? new Date(tenant.endDate).toLocaleDateString() : 'Not set'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${tenant.status === TenantStatus.ACTIVE ? 'bg-green-100 text-green-800 dark:bg-green-400/20 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-400/20 dark:text-red-200'}`}
                    >
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/tenants/${tenant.id}`}
                      className="text-primary hover:text-primary/90 hover:underline"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
