'use client';

import { ImageGallery } from '@/components/property/ImageGallery';
import { api } from '@/lib/trpc/react';
import { RoomStatus } from '@prisma/client';
import { Calendar, Plus } from 'lucide-react';
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
  const t = useTranslations();

  const { data: property, isLoading } = api.property.get.useQuery({ id: propertyId });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-primary"></div>
      </div>
    );
  }

  if (!property) {
    return <div>{t('properties.detail.notFound')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{property.name}</h1>
        <div className="flex space-x-4">
          <a
            href={`/properties/${property.id}/calendar`}
            className="flex items-center rounded-md bg-card px-4 py-2 text-sm font-medium text-foreground shadow hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Calendar className="mr-2 h-5 w-5" />
            {t('properties.detail.calendar')}
          </a>
          <a
            href={`/properties/${property.id}/rooms/new`}
            className="flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Plus className="mr-2 h-5 w-5" />
            {t('properties.detail.addRoom')}
          </a>
        </div>
      </div>

      <div className="mb-8">
        <ImageGallery images={property.images} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t('properties.detail.propertyDetails')}</h2>
          <div className="rounded-lg bg-card p-6 shadow">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('properties.detail.address')}</h3>
                <p className="mt-1 text-foreground">{property.address}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('properties.detail.description')}</h3>
                <p className="mt-1 text-foreground">{property.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t('properties.detail.facilities')}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {property.facilities.map((facility: string) => (
                    <span
                      key={facility}
                      className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary dark:bg-primary/20"
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
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t('properties.detail.rooms')}</h2>
          <div className="space-y-4">
            {property.rooms.map(room => (
              <div key={room.id} className="rounded-lg bg-card p-6 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">{t('properties.detail.roomNumber', { number: room.number })}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('properties.detail.roomDetails', { size: room.size, type: room.type })}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        room.status === 'AVAILABLE'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                          : room.status === 'OCCUPIED'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                      }`}
                    >
                      {t(`properties.detail.status.${room.status.toLowerCase()}`)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-lg font-semibold text-foreground">
                    {t('properties.detail.price', { price: room.price.toLocaleString() })}
                  </p>
                  <a
                    href={`/properties/${property.id}/rooms/${room.id}`}
                    className="text-sm font-medium text-primary hover:text-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {t('properties.detail.viewDetails')}
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
