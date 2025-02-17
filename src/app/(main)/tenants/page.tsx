'use client';

import { api } from '@/lib/trpc/react';
import { TenantStatus } from '@prisma/client';
import { Building2, CreditCard, Mail, Phone, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'ALL'>('ALL');

  const { data: tenants, isLoading } = api.tenant.list.useQuery({
    search,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Tenants</h1>
        <Link
          href="/tenants/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add New Tenant
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tenants by name, email, or room..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as TenantStatus | 'ALL')}
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tenants?.map(tenant => (
          <div key={tenant.id} className="rounded-lg bg-card p-6 shadow dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-card-foreground">{tenant.name}</h3>
                  <p className="text-sm text-muted-foreground">Room {tenant.room.number}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  tenant.status === TenantStatus.ACTIVE
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {tenant.status}
              </span>
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex items-center text-muted-foreground">
                <Mail className="mr-2 h-4 w-4" />
                {tenant.email}
              </div>
              <div className="flex items-center text-muted-foreground">
                <Phone className="mr-2 h-4 w-4" />
                {tenant.phone}
              </div>
              <div className="flex items-center text-muted-foreground">
                <CreditCard className="mr-2 h-4 w-4" />
                Rp {tenant.room.price.toLocaleString()} /month
              </div>
            </div>

            <Link
              href={`/tenants/${tenant.id}`}
              className="block w-full rounded-md bg-background px-4 py-2 text-center text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent"
            >
              View Details
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
