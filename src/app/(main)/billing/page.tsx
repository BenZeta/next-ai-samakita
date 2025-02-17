'use client';

import { api } from '@/lib/trpc/react';
import { BillingStatus } from '@prisma/client';
import { Building2, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function BillingPage() {
  const [search, setSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BillingStatus | 'ALL'>('ALL');

  const { data: properties, isLoading: propertiesLoading } = api.property.list.useQuery({
    search,
  });

  const { data: billings, isLoading: billingsLoading } = api.billing.list.useQuery({
    propertyId: selectedPropertyId || undefined,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
  });

  if (propertiesLoading || billingsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing</h1>
          <p className="mt-2 text-muted-foreground">Manage and track tenant billings</p>
        </div>
        <Link
          href="/billing/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Billing
        </Link>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {/* Property Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value as BillingStatus | 'ALL')}
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
        </select>
      </div>

      {/* Property List */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className={`cursor-pointer rounded-lg bg-card p-6 shadow transition-all hover:shadow-lg ${
            !selectedPropertyId ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => setSelectedPropertyId(null)}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">All Properties</h3>
              <p className="text-sm text-muted-foreground">View all billings</p>
            </div>
          </div>
        </div>

        {properties?.properties.map(property => (
          <div
            key={property.id}
            className={`cursor-pointer rounded-lg bg-card p-6 shadow transition-all hover:shadow-lg ${
              selectedPropertyId === property.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedPropertyId(property.id)}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{property.name}</h3>
                <p className="text-sm text-muted-foreground">{property.address}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Billings List */}
      <div className="rounded-lg bg-card shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {billings?.billings.map(billing => (
                <tr key={billing.id} className="hover:bg-muted/50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                    {billing.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                    {billing.tenant?.name} - Room {billing.tenant?.room.number}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                    {billing.tenant?.room.property.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                    Rp {billing.amount.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                    {new Date(billing.dueDate).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        billing.status === 'SENT'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {billing.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Link
                      href={`/billing/${billing.id}`}
                      className="text-primary hover:text-primary/80"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
