'use client';

import { RoomForm } from '@/components/room/RoomForm';
import { useParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

export default function NewRoomPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const t = useTranslations('properties.pages.room');

  return (
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <h1 className="mb-4 text-xl font-bold tracking-tight text-foreground sm:mb-8 sm:text-2xl md:text-3xl">
        {t('new.title')}
      </h1>
      <div className="mx-auto max-w-3xl">
        <RoomForm propertyId={propertyId} />
      </div>
    </div>
  );
}
