'use client';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/trpc/react';
import { RoomType } from '@prisma/client';
import { ArrowLeft, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'use-intl';

export default function CustomRoomTypePage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.propertyId as string;
  const roomType = params.type as RoomType;
  const customType = params.customType as string;
  const decodedCustomType = decodeURIComponent(customType);
  const t = useTranslations('properties.pages.details');

  const { data: property, isLoading } = api.property.get.useQuery({ id: propertyId });

  if (isLoading) {
    return <div>{t('loading')}</div>;
  }

  if (!property) {
    return <div>{t('notFound')}</div>;
  }

  // Filter rooms by type and custom type name
  const roomsOfType = property.rooms.filter(
    room => room.type === roomType && room.customTypeName === decodedCustomType
  );

  return (
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-4 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {decodedCustomType} {t('rooms')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2">{property.name}</p>
          </div>
        </div>
        <Link
          href={`/properties/${propertyId}/rooms/new?type=${roomType}&customType=${encodeURIComponent(decodedCustomType)}`}
          className="w-full sm:w-auto"
        >
          <Button className="w-full sm:w-auto">
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('addRoomOfType', { type: decodedCustomType })}
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roomsOfType.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-muted-foreground/20 p-6 text-center">
            <p className="text-muted-foreground">
              {t('noRoomsOfType', { type: decodedCustomType })}
            </p>
            <Link
              href={`/properties/${propertyId}/rooms/new?type=${roomType}&customType=${encodeURIComponent(decodedCustomType)}`}
              className="mt-4 inline-block"
            >
              <Button variant="outline" size="sm">
                <PlusIcon className="mr-2 h-4 w-4" />
                {t('addRoom')}
              </Button>
            </Link>
          </div>
        ) : (
          roomsOfType.map(room => (
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
                      {t('roomDetails', { size: room.size, type: decodedCustomType })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground sm:text-sm">{t('status.status')}</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground sm:mt-1 sm:text-base">
                      {t(`status.${room.status.toLowerCase()}`)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
