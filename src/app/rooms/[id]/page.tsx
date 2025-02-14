"use client";

import { useParams } from "next/navigation";
import { api } from "@/lib/trpc/react";
import { RoomCalendar } from "@/components/room/RoomCalendar";

export default function RoomDetailsPage() {
  const params = useParams();
  const roomId = params.id as string;

  const { data: room, isLoading } = api.room.get.useQuery({ id: roomId });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-gray-600">Room not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Room Details</h1>
        <p className="mt-2 text-sm text-gray-600">View room availability and tenant occupancy</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="col-span-2 space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">Availability Calendar</h2>
            <RoomCalendar roomId={roomId} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">Room Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Property</dt>
                <dd className="mt-1 text-sm text-gray-900">{room.property.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">{room.property.address}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Facilities</dt>
                <dd className="mt-1 text-sm text-gray-900">{room.property.facilities?.join(", ") || "No facilities listed"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">Current Tenant</h2>
            {room.tenants.some((tenant) => new Date(tenant.endDate!) > new Date()) ? (
              room.tenants
                .filter((tenant) => new Date(tenant.endDate!) > new Date())
                .map((tenant) => (
                  <div
                    key={tenant.id}
                    className="space-y-2">
                    <p className="font-medium text-gray-900">{tenant.name}</p>
                    <p className="text-sm text-gray-500">From: {new Date(tenant.startDate!).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500">To: {new Date(tenant.endDate!).toLocaleDateString()}</p>
                  </div>
                ))
            ) : (
              <p className="text-sm text-gray-500">No current tenant</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
