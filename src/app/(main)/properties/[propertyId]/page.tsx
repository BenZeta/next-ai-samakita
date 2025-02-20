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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{property.name}</h1>
          <p className="mt-2 text-muted-foreground">{property.address}</p>
        </div>
        <div className="flex gap-4">
          <Link href={`/properties/${propertyId}/calendar`}>
            <Button variant="outline" className="flex items-center gap-2">
              {t('calendar')}
            </Button>
          </Link>
          <Link href={`/properties/${propertyId}/rooms/new`}>
            <Button className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              {t('addRoom')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-8">
        <ImageGallery images={property.images} />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">{t('propertyDetails')}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('address')}</h3>
                <p className="mt-1">{property.address}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('description')}</h3>
                <p className="mt-1">{property.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('facilities')}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {property.facilities.map(facility => (
                    <span
                      key={facility}
                      className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
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
          <h2 className="mb-4 text-xl font-semibold">{t('rooms')}</h2>
          <div className="space-y-4">
            {property.rooms.map(room => (
              <Link
                key={room.id}
                href={`/properties/${propertyId}/rooms/${room.id}`}
                className="block"
              >
                <div className="rounded-lg bg-card p-6 shadow-sm transition-colors hover:bg-accent">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{t('roomNumber', { number: room.number })}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('roomDetails', { size: room.size, type: room.type })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t('status.status')}</p>
                      <p className="mt-1 font-medium text-foreground">
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
