'use client';

import { PropertyCard } from '@/components/property/PropertyCard';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/trpc/react';
import { Filter, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'use-intl';

export default function PropertiesPage() {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 10;

  // Fetch property groups
  const { data: propertyGroupsData } = api.propertyGroup.list.useQuery();
  const propertyGroups = propertyGroupsData?.groups || [];

  useEffect(() => {
    setIsSearching(false);
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedGroupId]);

  const { data, isFetching, isInitialLoading } = api.property.list.useQuery(
    {
      search: debouncedSearch,
      page,
      limit,
      propertyGroupId: selectedGroupId,
    },
    {
      keepPreviousData: true,
      staleTime: 5000,
    }
  );

  const properties = data?.properties ?? [];
  const { total, totalPages } = data?.pagination ?? { total: 0, totalPages: 0 };

  const clearFilters = () => {
    setSelectedGroupId(undefined);
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  return (
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-4 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {t('properties.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">{t('properties.subtitle')}</p>
        </div>
        <Link
          href="/properties/new"
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('properties.addProperty')}
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('properties.searchProperties')}
              className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:h-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {t('common.filter')}
            {selectedGroupId && <span className="rounded-full bg-primary w-2 h-2"></span>}
          </Button>

          {(selectedGroupId || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              {t('propertyGroups.clearFilters')}
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">{t('propertyGroups.filterByGroup')}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder={t('propertyGroups.selectGroup')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('propertyGroups.allGroups')}</SelectItem>
                {propertyGroups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="relative min-h-[300px]">
        {(isInitialLoading || (isFetching && !isInitialLoading)) && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-background/80 px-4 py-2 shadow-lg backdrop-blur sm:bottom-8 sm:right-8">
            <div className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-primary/30 border-t-primary"></div>
            <p className="text-sm font-medium text-muted-foreground">
              {isInitialLoading
                ? t('properties.pages.list.loading')
                : t('properties.pages.list.searching')}
            </p>
          </div>
        )}

        <div
          className={`grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 ${
            isInitialLoading || isFetching ? 'opacity-60' : 'opacity-100'
          } transition-opacity duration-200`}
        >
          {properties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {properties.length === 0 && !isInitialLoading && !isFetching && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-background/50 px-3 py-8 text-center sm:px-4 sm:py-12">
            <p className="text-base font-medium text-foreground sm:text-lg">
              {selectedGroupId || search
                ? t('properties.empty.noResults')
                : t('properties.empty.title')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedGroupId || search
                ? t('properties.empty.tryDifferentFilters')
                : t('properties.empty.description')}
            </p>
            {!selectedGroupId && !search ? (
              <Link
                href="/properties/new"
                className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('properties.empty.addProperty')}
              </Link>
            ) : (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                {t('properties.clearFilters')}
              </Button>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex w-full items-center justify-center rounded-md bg-card px-4 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
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
            className="inline-flex w-full items-center justify-center rounded-md bg-card px-4 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
          >
            {t('properties.pages.list.pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
