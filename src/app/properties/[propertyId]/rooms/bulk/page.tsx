"use client";

import { BulkRoomForm } from "@/components/room/BulkRoomForm";
import { useParams } from "next/navigation";

export default function BulkRoomCreationPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Bulk Room Creation</h1>
      <div className="rounded-lg bg-white p-6 shadow">
        <BulkRoomForm propertyId={propertyId} />
      </div>
    </div>
  );
}
