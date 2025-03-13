'use client';

import { RoomForm } from '@/components/room/RoomForm';
import { RoomType } from '@prisma/client';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

export default function NewRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const propertyId = params.propertyId as string;
  const t = useTranslations('properties.pages.room');

  // Get room type and custom type from URL parameters
  const typeParam = searchParams.get('type');
  const customTypeParam = searchParams.get('customType');

  // Only use valid room types
  const type =
    typeParam && Object.values(RoomType).includes(typeParam as RoomType)
      ? (typeParam as RoomType)
      : undefined;

  // Only use custom type if type is CUSTOM
  const customTypeName =
    type === 'CUSTOM' && customTypeParam ? decodeURIComponent(customTypeParam) : undefined;

  // Create initial data with pre-selected type
  const initialData = type
    ? {
        number: '',
        size: 0,
        price: 0,
        type,
        ...(customTypeName && { customTypeName }),
        amenities: [],
      }
    : undefined;

  return (
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <h1 className="mb-4 text-xl font-bold tracking-tight text-foreground sm:mb-8 sm:text-2xl md:text-3xl">
        {type
          ? t('new.titleWithType', {
              type:
                type === 'CUSTOM' && customTypeName
                  ? customTypeName
                  : t(`types.${type.toLowerCase()}`),
            })
          : t('new.title')}
      </h1>
      <div className="mx-auto max-w-3xl">
        <RoomForm propertyId={propertyId} initialData={initialData} />
      </div>
    </div>
  );
}
