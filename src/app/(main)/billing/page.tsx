'use client';

import { api } from '@/lib/trpc/react';
import { BillingStatus, PaymentType } from '@prisma/client';
import { Building2, Check, ChevronsUpDown, FileText, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';

type BillingTypeFilter = 'ALL' | PaymentType;

export default function BillingPage() {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BillingStatus | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<BillingTypeFilter>('ALL');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: properties } = api.property.list.useQuery({
    search: debouncedSearch,
  });

  const { data: billings, isLoading } = api.billing.list.useQuery({
    search: debouncedSearch,
    propertyId: selectedPropertyId ?? undefined,
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
  });

  // Filter billings based on type
  const filteredBillings = billings?.billings.filter(billing => {
    if (selectedType === 'ALL') return true;
    return billing.type === selectedType;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('billing.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('billing.subtitle')}</p>
        </div>
        <Link
          href="/billing/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('billing.createNew')}
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('billing.searchBilling')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as BillingTypeFilter)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="ALL">{t('billing.type.all')}</option>
            {Object.values(PaymentType).map(type => (
              <option key={type} value={type}>
                {t(`billing.type.${type}`)}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as BillingStatus | 'ALL')}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="ALL">{t('billing.status.all')}</option>
            {Object.values(BillingStatus).map(status => (
              <option key={status} value={status}>
                {t(`billing.status.${status.toLowerCase()}`)}
              </option>
            ))}
          </select>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>
                {selectedPropertyId
                  ? properties?.properties.find(p => p.id === selectedPropertyId)?.name ||
                    t('billing.filters.property.select')
                  : t('billing.filters.property.all')}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
            </button>

            {isOpen && (
              <div className="absolute right-0 z-50 mt-1 min-w-[200px] rounded-lg border border-input bg-card p-1 shadow-md">
                <div
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"
                  onClick={() => {
                    setSelectedPropertyId(null);
                    setIsOpen(false);
                  }}
                >
                  <Check
                    className={`h-4 w-4 ${!selectedPropertyId ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <span>{t('billing.filters.property.all')}</span>
                </div>
                {properties?.properties.map(property => (
                  <div
                    key={property.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"
                    onClick={() => {
                      setSelectedPropertyId(property.id);
                      setIsOpen(false);
                    }}
                  >
                    <Check
                      className={`h-4 w-4 ${
                        selectedPropertyId === property.id ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <span>{property.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!filteredBillings?.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-background p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">{t('billing.noBilling')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {search || selectedStatus !== 'ALL' || selectedPropertyId
              ? t('billing.noResults.withFilters')
              : t('billing.noResults.noFilters')}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {filteredBillings.map(billing => (
            <Link
              key={billing.id}
              href={`/billing/${billing.id}`}
              className="flex items-center gap-4 p-4 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="truncate">
                    <p className="truncate font-medium text-foreground">{billing.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {billing.tenant?.room?.number
                        ? `${t('billing.details.room')} ${billing.tenant.room.number}`
                        : t('billing.details.property')}{' '}
                      - Rp {billing.amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      {new Date(billing.dueDate).toLocaleDateString()}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        billing.status === 'SENT'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : billing.status === 'DRAFT'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {t(`billing.status.${billing.status.toLowerCase()}`)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
