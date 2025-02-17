'use client';

import { ExpenseList } from '@/components/expense/ExpenseList';
import { api } from '@/lib/trpc/react';
import { Building2, Check, ChevronsUpDown, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    data: properties,
    isFetching,
    isInitialLoading,
  } = api.property.list.useQuery(
    {
      search: debouncedSearch,
    },
    {
      keepPreviousData: true,
      staleTime: 5000,
    }
  );

  // Find selected property name
  const selectedProperty = properties?.properties.find(p => p.id === selectedPropertyId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
        <p className="mt-2 text-muted-foreground">
          Track and manage expenses across all properties
        </p>
      </div>

      {/* Property Selector Dropdown */}
      <div className="relative mb-8" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-full rounded-lg border border-input bg-background px-4 py-3 text-left text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <span className="flex-1">
              {selectedProperty ? selectedProperty.name : 'All Properties'}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-input bg-background shadow-lg animate-in fade-in-0 zoom-in-95">
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-9 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onClick={e => e.stopPropagation()}
                />
                {(isInitialLoading || (isFetching && !isInitialLoading)) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1">
              <div
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"
                onClick={() => {
                  setSelectedPropertyId(null);
                  setIsOpen(false);
                }}
              >
                <div className="flex flex-1 items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">All Properties</span>
                </div>
                {!selectedPropertyId && <Check className="h-4 w-4 text-primary" />}
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
                  <div className="flex flex-1 items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{property.name}</span>
                      <span className="text-xs text-muted-foreground">{property.address}</span>
                    </div>
                  </div>
                  {selectedPropertyId === property.id && <Check className="h-4 w-4 text-primary" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-card p-6 shadow dark:bg-gray-800">
        <ExpenseList propertyId={selectedPropertyId || undefined} />
      </div>
    </div>
  );
}
