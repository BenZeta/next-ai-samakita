'use client';

import { PropertyCard } from '@/components/property/PropertyCard';
import { api } from '@/lib/trpc/react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('properties.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('properties.subtitle')}</p>
        </div>
        <Link
          href="/properties/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t('properties.addProperty')}
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('properties.searchProperties')}
            className="w-full h-12 rounded-xl border border-input bg-background pl-12 pr-12 text-sm"
          />
        </div>
      </div>

      <div className="min-h-[300px] relative">
        {(isInitialLoading || (isFetching && !isInitialLoading)) && (
          <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-primary/30 border-t-primary"></div>
            <p className="text-sm font-medium text-muted-foreground">
              {isInitialLoading ? t('properties.pages.list.loading') : t('properties.pages.list.searching')}
            </p>
          </div>
        )}

        <div
          className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${isInitialLoading || isFetching ? 'opacity-60' : 'opacity-100'} transition-opacity duration-200`}
        >
          {properties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {properties.length === 0 && !isInitialLoading && !isFetching && (
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">{t('properties.noProperties')}</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md bg-card px-3 py-2 text-sm"
          >
            {t('properties.pages.list.pagination.previous')}
          </button>
          <span className="flex items-center text-sm text-muted-foreground">
            {t('properties.pages.list.pagination.page')} {page} {t('properties.pages.list.pagination.of')} {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md bg-card px-3 py-2 text-sm"
          >
            {t('properties.pages.list.pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
