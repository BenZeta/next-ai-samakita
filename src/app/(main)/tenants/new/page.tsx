'use client';

import { api } from '@/lib/trpc/react';
import { Building2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewTenantPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const { data: properties, isLoading: propertiesLoading } = api.property.list.useQuery({
    search,
    page: 1,
    limit: 100,
  });

  const { data: rooms, isLoading: roomsLoading } = api.room.list.useQuery(
    {
      propertyId: selectedPropertyId!,
    },
    {
      enabled: !!selectedPropertyId,
    }
  );

  if (propertiesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Add New Tenant</h1>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {properties?.properties.map(property => (
          <div
            key={property.id}
            className={`cursor-pointer rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg ${selectedPropertyId === property.id ? 'ring-2 ring-indigo-500' : ''}`}
            onClick={() => setSelectedPropertyId(property.id)}
          >
            <div className="flex items-center">
              <div className="rounded-full bg-indigo-100 p-3">
                <Building2 className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{property.name}</h3>
                <p className="text-sm text-gray-500">{property.address}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPropertyId && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Select Room</h2>
          {roomsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms?.map(room => (
                <button
                  key={room.id}
                  onClick={() => router.push(`/rooms/${room.id}/tenants/new`)}
                  className="flex items-center justify-between rounded-lg border border-input bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow dark:bg-gray-800"
                >
                  <div>
                    <h3 className="font-medium text-card-foreground">Room {room.number}</h3>
                    <p className="text-sm text-muted-foreground">{room.type}</p>
                  </div>
                  <p className="text-lg font-semibold text-card-foreground">
                    Rp {room.price.toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
