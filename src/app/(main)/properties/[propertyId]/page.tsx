'use client';

import { ImageGallery } from '@/components/property/ImageGallery';
import { api } from '@/lib/trpc/react';
import { RoomStatus } from '@prisma/client';
import { Calendar, Plus } from 'lucide-react';
import { useParams } from 'next/navigation';

interface Property {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  location: string;
  images: string[];
  facilities: string[];
  rooms: {
    id: string;
    number: string;
    floor: number;
    type: string;
    size: number;
    price: number;
    status: RoomStatus;
    createdAt: Date;
    updatedAt: Date;
    propertyId: string;
  }[];
}

export default function PropertyDetailsPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;

  const { data: property, isLoading } = api.property.get.useQuery({ id: propertyId });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!property) {
    return <div>Property not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{property.name}</h1>
        <div className="flex space-x-4">
          <a
            href={`/properties/${property.id}/calendar`}
            className="flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow hover:bg-gray-50"
          >
            <Calendar className="mr-2 h-5 w-5" />
            Calendar
          </a>
          <a
            href={`/properties/${property.id}/rooms/new`}
            className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Room
          </a>
        </div>
      </div>

      <div className="mb-8">
        <ImageGallery images={property.images} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Property Details</h2>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Address</h3>
                <p className="mt-1 text-gray-900">{property.address}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1 text-gray-900">{property.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Facilities</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {property.facilities.map((facility: string) => (
                    <span
                      key={facility}
                      className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800"
                    >
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Rooms</h2>
          <div className="space-y-4">
            {property.rooms.map(room => (
              <div key={room.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Room {room.number}</h3>
                    <p className="text-sm text-gray-500">
                      {room.size} sqm • {room.type}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        room.status === 'AVAILABLE'
                          ? 'bg-green-100 text-green-800'
                          : room.status === 'OCCUPIED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-lg font-semibold text-gray-900">
                    Rp {room.price.toLocaleString()}
                  </p>
                  <a
                    href={`/properties/${property.id}/rooms/${room.id}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    View Details
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
