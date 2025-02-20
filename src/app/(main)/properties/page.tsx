'use client';

import { PropertyCard } from '@/components/property/PropertyCard';
import { api } from '@/lib/trpc/react';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'use-intl';

export default function PropertiesPage() {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setIsSearching(false);
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const { data, isFetching, isInitialLoading } = api.property.list.useQuery(
    {
      search: debouncedSearch,
      page,
      limit,
    },
    {
      keepPreviousData: true,
      staleTime: 5000,
    }
  );

  const properties = data?.properties ?? [];
  const { total, totalPages } = data?.pagination ?? { total: 0, totalPages: 0 };

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('properties.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('properties.subtitle')}</p>
        </div>
        <Link
          href="/properties/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('properties.addProperty')}
        </Link>
      </div>

      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('properties.searchProperties')}
            className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
      </div>

      <div className="min-h-[300px] relative">
        {(isInitialLoading || (isFetching && !isInitialLoading)) && (
          <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-lg bg-background/80 px-4 py-2 shadow-lg backdrop-blur">
            <div className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-primary/30 border-t-primary"></div>
            <p className="text-sm font-medium text-muted-foreground">
              {isInitialLoading
                ? t('properties.pages.list.loading')
                : t('properties.pages.list.searching')}
            </p>
          </div>
        )}

        <div
          className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${
            isInitialLoading || isFetching ? 'opacity-60' : 'opacity-100'
          } transition-opacity duration-200`}
        >
          {properties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {properties.length === 0 && !isInitialLoading && !isFetching && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-background/50 px-4 py-12 text-center">
            <p className="text-lg font-medium text-foreground">{t('properties.empty.title')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('properties.empty.description')}
            </p>
            <Link
              href="/properties/new"
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('properties.empty.addProperty')}
            </Link>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center justify-center rounded-md bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            {t('properties.pages.list.pagination.previous')}
          </button>
          <span className="text-sm text-muted-foreground">
            {t('properties.pages.list.pagination.page')} {page}{' '}
            {t('properties.pages.list.pagination.of')} {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center justify-center rounded-md bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            {t('properties.pages.list.pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
