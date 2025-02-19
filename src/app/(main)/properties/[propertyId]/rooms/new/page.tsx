"use client";

import { RoomForm } from "@/components/room/RoomForm";
import { useParams } from "next/navigation";
import { useTranslations } from "use-intl";

export default function NewRoomPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const t = useTranslations('properties.room');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">{t('new.title')}</h1>
      <div className="mx-auto max-w-3xl">
        <RoomForm propertyId={propertyId} />
      </div>
    </div>
  );
}
