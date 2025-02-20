'use client';

import { api } from '@/lib/trpc/react';
import { TenantStatus } from '@prisma/client';
import { Building2, CreditCard, Mail, Phone, Search, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';

export default function TenantsPage() {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'ALL'>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Use debounced search value for the API query
  const { data: tenants, isLoading } = api.tenant.list.useQuery(
    {
      search: debouncedSearch,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    },
    {
      staleTime: 0, // Set staleTime to 0 to always refetch on focus
      refetchOnWindowFocus: true, // Enable refetch on window focus
    }
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      // Restore focus to the input after search
      searchInputRef.current?.focus();
    }, 300); // Wait for 300ms of no typing before updating search

    return () => clearTimeout(timer);
  }, [search]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t('tenants.title')}</h1>
        <Link
          href="/tenants/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {t('tenants.addTenant')}
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('tenants.searchTenants')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as TenantStatus | 'ALL')}
          className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="ALL">{t('tenants.status.all')}</option>
          <option value="ACTIVE">{t('tenants.status.active')}</option>
          <option value="INACTIVE">{t('tenants.status.inactive')}</option>
        </select>
      </div>

      {!tenants?.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-input bg-background p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">{t('tenants.noTenants')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {search || statusFilter !== 'ALL'
              ? t('tenants.noResults.withFilters')
              : t('tenants.noResults.noFilters')}
          </p>
          <Link
            href="/tenants/new"
            className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {t('tenants.addTenant')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map(tenant => (
            <div key={tenant.id} className="rounded-lg bg-card p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-foreground">{tenant.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('tenants.details.room')} {tenant.room.number}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    tenant.status === TenantStatus.ACTIVE
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {t(`tenants.status.${tenant.status.toLowerCase()}`)}
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
                  {t('tenants.details.price', { price: tenant.room.price.toLocaleString() })}
                </div>
              </div>

              <Link
                href={`/tenants/${tenant.id}`}
                className="block w-full rounded-md bg-background px-4 py-2 text-center text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {t('tenants.details.viewDetails')}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
