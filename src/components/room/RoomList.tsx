'use client';

import { api } from '@/lib/trpc/react';
import { Building2, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface RoomListProps {
  propertyId: string;
}

export function RoomList({ propertyId }: RoomListProps) {
  const [selectedStatus, setSelectedStatus] = useState<
    'available' | 'occupied' | 'maintenance' | undefined
  >();

  const { data: rooms, isLoading } = api.room.list.useQuery({
    propertyId,
    status: selectedStatus,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!rooms?.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-gray-600">No rooms found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Rooms</h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedStatus || ''}
            onChange={e =>
              setSelectedStatus(
                e.target.value
                  ? (e.target.value as 'available' | 'occupied' | 'maintenance')
                  : undefined
              )
            }
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Under Maintenance</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map(room => (
          <Link
            key={room.id}
            href={`/properties/${room.property.id}/rooms/${room.id}`}
            className="group relative overflow-hidden rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg"
          >
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{room.property.name}</p>
                <p className="text-lg font-semibold text-gray-900">Room {room.number}</p>
              </div>
            </div>

            <div className="mt-4">
              {room.tenants.some(tenant => new Date(tenant.endDate!) > new Date()) ? (
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Occupied</span>
                </div>
              ) : (
                <div className="flex items-center text-sm text-green-600">
                  <span>Available</span>
                </div>
              )}
            </div>

            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-50 opacity-20 transition-transform group-hover:scale-150" />
          </Link>
        ))}
      </div>
    </div>
  );
}
