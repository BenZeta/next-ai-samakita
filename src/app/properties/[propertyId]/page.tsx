"use client";

import { api } from "@/lib/trpc/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RoomList } from "@/components/room/RoomList";
import { Building2, Plus, Calendar } from "lucide-react";
import { ImageGallery } from "@/components/property/ImageGallery";

export default function PropertyDetailsPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;

  const { data: property, isLoading } = api.property.get.useQuery({ id: propertyId });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!property) {
    return <div>Property not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{property.name}</h1>
          <p className="mt-2 text-gray-600">{property.address}</p>
        </div>
        <div className="flex space-x-4">
          <Link
            href={`/properties/${propertyId}/calendar`}
            className="flex items-center rounded-md bg-white px-4 py-2 text-gray-700 shadow hover:bg-gray-50">
            <Calendar className="mr-2 h-5 w-5" />
            View Calendar
          </Link>
          <Link
            href={`/properties/${propertyId}/rooms/new`}
            className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            <Plus className="mr-2 h-5 w-5" />
            Add Room
          </Link>
          <Link
            href={`/properties/${propertyId}/rooms/bulk`}
            className="flex items-center rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">
            <Building2 className="mr-2 h-5 w-5" />
            Bulk Add Rooms
          </Link>
        </div>
      </div>

      <div className="mb-8">
        <ImageGallery images={property.images} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Property Details</h2>
          <div className="prose max-w-none">
            <p>{property.description}</p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium">Facilities</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {property.facilities.map((facility) => (
                <span
                  key={facility}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  {facility}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Rooms</h2>
          <RoomList propertyId={propertyId} />
        </div>
      </div>
    </div>
  );
}
