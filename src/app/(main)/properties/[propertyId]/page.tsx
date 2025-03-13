'use client';

import { ImageGallery } from '@/components/property/ImageGallery';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/trpc/react';
import { RoomStatus, RoomType } from '@prisma/client';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslations } from 'use-intl';

interface Room {
  id: string;
  number: string;
  floor?: number | null;
  type: RoomType;
  customTypeName: string | null;
  size: number;
  price: number;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
  propertyId: string;
}

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
  rooms: Room[];
}

// Interface for grouped rooms
interface RoomTypeGroup {
  type: RoomType;
  typeName: string;
  rooms: Room[];
  available: number;
  total: number;
}

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.propertyId as string;
  const t = useTranslations('properties.pages.details');

  const { data: property, isLoading } = api.property.get.useQuery({ id: propertyId });

  // Group rooms by type
  const roomGroups = useMemo(() => {
    if (!property) return [];

    const groups: Record<string, RoomTypeGroup> = {};

    // Process each room
    property.rooms.forEach(room => {
      // For custom types, use the customTypeName or fallback to "Custom"
      const typeKey =
        room.type === 'CUSTOM' && room.customTypeName ? `CUSTOM-${room.customTypeName}` : room.type;

      // Initialize group if it doesn't exist
      if (!groups[typeKey]) {
        const typeName =
          room.type === 'CUSTOM' && room.customTypeName
            ? room.customTypeName
            : t(`types.${room.type.toLowerCase()}`);

        groups[typeKey] = {
          type: room.type,
          typeName,
          rooms: [],
          available: 0,
          total: 0,
        };
      }

      // Add room to the group
      groups[typeKey].rooms.push(room);
      groups[typeKey].total++;

      // Count available rooms
      if (room.status === 'AVAILABLE') {
        groups[typeKey].available++;
      }
    });

    // Convert to array and sort by type name
    return Object.values(groups).sort((a, b) => a.typeName.localeCompare(b.typeName));
  }, [property, t]);

  const handleRoomTypeClick = (type: RoomType, customTypeName?: string | null) => {
    // In the future, this will navigate to a page showing all rooms of this type
    // For now, we'll just log it
    console.log(`Clicked on room type: ${type}${customTypeName ? ` (${customTypeName})` : ''}`);
    // TODO: Implement navigation to room type page
  };

  if (isLoading) {
    return <div>{t('loading')}</div>;
  }

  if (!property) {
    return <div>{t('notFound')}</div>;
  }

  return (
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-4 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{property.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2">{property.address}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-4">
          <Link href={`/properties/${propertyId}/rooms/new`} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <PlusIcon className="mr-2 h-4 w-4" />
              {t('addRoom')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 sm:mb-8">
        <ImageGallery images={property.images} />
      </div>

      <div className="grid gap-4 sm:gap-8 md:grid-cols-2">
        <div className="space-y-4 sm:space-y-6">
          <div className="rounded-lg bg-card p-4 shadow-sm sm:p-6">
            <h2 className="mb-3 text-lg font-semibold sm:mb-4 sm:text-xl">
              {t('propertyDetails')}
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('address')}</h3>
                <p className="mt-1 text-sm sm:text-base">{property.address}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('description')}</h3>
                <p className="mt-1 text-sm sm:text-base">{property.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('facilities')}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                  {property.facilities.map(facility => (
                    <span
                      key={facility}
                      className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground sm:px-3 sm:py-1 sm:text-sm"
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
          <h2 className="mb-3 text-lg font-semibold sm:mb-4 sm:text-xl">{t('roomTypes')}</h2>
          <div className="space-y-3 sm:space-y-4">
            {roomGroups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/20 p-6 text-center">
                <p className="text-muted-foreground">{t('noRoomsYet')}</p>
                <Link href={`/properties/${propertyId}/rooms/new`} className="mt-4 inline-block">
                  <Button variant="outline" size="sm">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    {t('addRoom')}
                  </Button>
                </Link>
              </div>
            ) : (
              roomGroups.map(group => (
                <div
                  key={`${group.type}-${group.typeName}`}
                  onClick={() =>
                    router.push(
                      `/properties/${propertyId}/room-types/${encodeURIComponent(group.type)}${group.type === 'CUSTOM' ? `/${encodeURIComponent(group.typeName)}` : ''}`
                    )
                  }
                  className="rounded-lg bg-card p-4 shadow-sm transition-colors hover:bg-accent cursor-pointer sm:p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium sm:text-lg">{group.typeName}</h3>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        {t('roomCount', { count: group.total })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground sm:text-sm">{t('occupancy')}</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground sm:mt-1 sm:text-base">
                        {group.total - group.available}/{group.total}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
