import Image from "next/image";
import Link from "next/link";
import { Building2, Home, Users } from "lucide-react";

interface PropertyCardProps {
  property: {
    id: string;
    name: string;
    address: string;
    facilities: string[];
    images: string[];
    rooms: {
      id: string;
      tenants: any[];
    }[];
  };
}

export function PropertyCard({ property }: PropertyCardProps) {
  const totalRooms = property.rooms.length;
  const occupiedRooms = property.rooms.filter((room) => room.tenants.length > 0).length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-lg">
      <div className="aspect-video relative">
        {property.images[0] ? (
          <Image
            src={property.images[0]}
            alt={property.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <Building2 className="h-12 w-12 text-gray-400" />
          </div>
        )}
      </div>

      <div className="p-4">
        <h2 className="mb-1 text-lg font-semibold text-gray-900 group-hover:text-indigo-600">{property.name}</h2>
        <p className="mb-4 text-sm text-gray-600">{property.address}</p>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Home className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{totalRooms}</p>
              <p className="text-xs text-gray-500">Rooms</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{occupancyRate}%</p>
              <p className="text-xs text-gray-500">Occupied</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {property.facilities.slice(0, 3).map((facility) => (
            <span
              key={facility}
              className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
              {facility}
            </span>
          ))}
          {property.facilities.length > 3 && <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">+{property.facilities.length - 3} more</span>}
        </div>
      </div>
    </Link>
  );
}
