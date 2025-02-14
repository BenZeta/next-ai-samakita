"use client";

import { api } from "@/lib/trpc/react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { RoomList } from "@/components/room/RoomList";

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;

  const { data: property, isLoading } = api.property.get.useQuery({ id: propertyId });

  if (isLoading) {
    return <div className="text-center">Loading property details...</div>;
  }

  if (!property) {
    return <div className="text-center">Property not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-6">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={property.images[0]}
            alt={property.name}
            fill
            className="object-cover"
          />
        </div>

        <div>
          <h1 className="text-3xl font-bold">{property.name}</h1>
          <p className="mt-2 text-gray-600">{property.address}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-gray-600">{property.description}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Facilities</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {property.facilities.map((facility) => (
              <span
                key={facility}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                {facility}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold">Rooms</h2>
        <RoomList propertyId={propertyId} />
      </div>
    </div>
  );
}
