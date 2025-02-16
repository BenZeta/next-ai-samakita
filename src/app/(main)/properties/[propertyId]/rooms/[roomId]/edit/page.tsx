"use client";

import { RoomForm } from "@/components/room/RoomForm";
import { api } from "@/lib/trpc/react";
import { useParams } from "next/navigation";
import { RoomStatus } from "@prisma/client";

export default function EditRoomPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const roomId = params.roomId as string;

  const { data: room, isLoading } = api.room.get.useQuery({ id: roomId });

  if (isLoading) {
    return <div className="text-center">Loading room details...</div>;
  }

  if (!room) {
    return <div className="text-center">Room not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Edit Room</h1>
      <div className="mx-auto max-w-3xl">
        <RoomForm
          propertyId={propertyId}
          initialData={{
            id: room.id,
            number: room.number,
            type: room.status as RoomStatus,
            size: room.size,
            price: room.price,
            amenities: room.amenities,
          }}
        />
      </div>
    </div>
  );
}
