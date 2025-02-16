'use client';

import { ExpenseList } from '@/components/expense/ExpenseList';
import { api } from '@/lib/trpc/react';
import { Building2, Search } from 'lucide-react';
import { useState } from 'react';

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const { data: properties, isLoading } = api.property.list.useQuery({
    search,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
        <p className="mt-2 text-muted-foreground">
          Track and manage expenses across all properties
        </p>
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-10 text-foreground focus:border-primary focus:ring-primary"
          />
        </div>
      </div>

      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className={`cursor-pointer rounded-lg bg-card p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800 ${!selectedPropertyId ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedPropertyId(null)}
        >
          <div className="flex items-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-card-foreground">All Properties</h3>
              <p className="text-sm text-muted-foreground">View expenses across all properties</p>
            </div>
          </div>
        </div>

        {properties?.properties.map(property => (
          <div
            key={property.id}
            className={`cursor-pointer rounded-lg bg-card p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800 ${selectedPropertyId === property.id ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedPropertyId(property.id)}
          >
            <div className="flex items-center">
              <div className="rounded-full bg-primary/10 p-3">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-card-foreground">{property.name}</h3>
                <p className="text-sm text-muted-foreground">{property.address}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-card p-6 shadow dark:bg-gray-800">
        <ExpenseList propertyId={selectedPropertyId || undefined} />
      </div>
    </div>
  );
}
