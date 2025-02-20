'use client';

import { ImageGallery } from '@/components/property/ImageGallery';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/trpc/react';
import { RoomStatus } from '@prisma/client';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

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
  const t = useTranslations('properties.pages.details');

  const { data: property, isLoading } = api.property.get.useQuery({ id: propertyId });

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
          <h2 className="mb-3 text-lg font-semibold sm:mb-4 sm:text-xl">{t('rooms')}</h2>
          <div className="space-y-3 sm:space-y-4">
            {property.rooms.map(room => (
              <Link
                key={room.id}
                href={`/properties/${propertyId}/rooms/${room.id}`}
                className="block"
              >
                <div className="rounded-lg bg-card p-4 shadow-sm transition-colors hover:bg-accent sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium sm:text-base">
                        {t('roomNumber', { number: room.number })}
                      </h3>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        {t('roomDetails', { size: room.size, type: room.type })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        {t('status.status')}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground sm:mt-1 sm:text-base">
                        {t(`status.${room.status.toLowerCase()}`)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
