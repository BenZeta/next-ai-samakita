'use client';

import { ExpenseList } from '@/components/expense/ExpenseList';
import { api } from '@/lib/trpc/react';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

interface Property {
  id: string;
  name: string;
}

export default function ExpensesPage() {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null | undefined>(
    undefined
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: propertyData } = api.property.list.useQuery({
    search: debouncedSearch,
  });

  const properties = propertyData?.properties || [];

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

  const getSelectedPropertyName = () => {
    if (selectedPropertyId === undefined) return t('expenses.filters.all');
    if (selectedPropertyId === null) return t('expenses.filters.general');
    return properties.find(p => p.id === selectedPropertyId)?.name;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('expenses.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('expenses.subtitle2')}</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{getSelectedPropertyName()}</span>
            </div>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {isOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-input bg-card p-1 shadow-md">
              <button
                onClick={() => {
                  setSelectedPropertyId(undefined);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
              >
                <span>{t('expenses.filters.all')}</span>
                {selectedPropertyId === undefined && <Check className="ml-auto h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  setSelectedPropertyId(null);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
              >
                <span>{t('expenses.filters.general')}</span>
                {selectedPropertyId === null && <Check className="ml-auto h-4 w-4" />}
              </button>
              <div className="my-1 border-t border-input"></div>
              {properties.map(property => (
                <button
                  key={property.id}
                  onClick={() => {
                    setSelectedPropertyId(property.id);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <span>{property.name}</span>
                  {selectedPropertyId === property.id && <Check className="ml-auto h-4 w-4" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ExpenseList
        propertyId={selectedPropertyId}
        isAddingExpense={isAddingExpense}
        setIsAddingExpense={setIsAddingExpense}
      />
    </div>
  );
}
