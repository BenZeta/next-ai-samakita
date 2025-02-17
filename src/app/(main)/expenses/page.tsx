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

  const { data: properties } = api.property.list.useQuery({
    search: debouncedSearch,
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
        <p className="mt-2 text-muted-foreground">Track and manage your property expenses</p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
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

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {selectedPropertyId
                ? properties?.properties.find(p => p.id === selectedPropertyId)?.name ||
                  'Select Property'
                : 'All Properties'}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {isOpen && (
            <div className="absolute z-10 mt-2 w-full rounded-lg border border-input bg-card p-2 shadow-lg">
              <div
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                onClick={() => {
                  setSelectedPropertyId(null);
                  setIsOpen(false);
                }}
              >
                <Check className={`h-4 w-4 ${!selectedPropertyId ? 'opacity-100' : 'opacity-0'}`} />
                <span>All Properties</span>
              </div>
              {properties?.properties.map(property => (
                <div
                  key={property.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
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

      <ExpenseList propertyId={selectedPropertyId ?? undefined} />
    </div>
  );
}
