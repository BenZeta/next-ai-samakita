"use client";

import { useParams } from "next/navigation";
import { TenantForm } from "@/components/tenant/TenantForm";
import { api } from "@/lib/trpc/react";

export default function NewTenantPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;

  // Get the first available room in the property
  const { data: rooms, isLoading } = api.room.list.useQuery({
    propertyId,
    status: "available",
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!rooms?.length) {
    return <div>No available rooms in this property</div>;
  }

  const roomId = rooms[0].id;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Add New Tenant</h1>
      <div className="mx-auto max-w-3xl">
        <TenantForm
          roomId={roomId}
          initialData={{
            propertyId,
            userId: "",
            amount: 0,
          }}
          onSuccess={() => {
            // Handle success (e.g., redirect to property details)
            window.location.href = `/properties/${propertyId}`;
          }}
        />
      </div>
    </div>
  );
}
