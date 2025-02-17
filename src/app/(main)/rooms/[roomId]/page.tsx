'use client';

import { api } from '@/lib/trpc/react';
import { RoomStatus, TenantStatus } from '@prisma/client';
import { Building2, Calendar, DollarSign, Users, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  startDate: Date | null;
  endDate: Date | null;
}

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: room, isLoading } = api.room.get.useQuery({ id: roomId });
  const utils = api.useContext();

  const updateRoomStatus = api.room.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Room status updated successfully');
      utils.room.get.invalidate({ id: roomId });
      setIsUpdating(false);
    },
    onError: error => {
      toast.error(error.message);
      setIsUpdating(false);
    },
  });

  const handleMaintenanceToggle = async () => {
    if (!room) return;
    setIsUpdating(true);

    const newStatus =
      room.status === RoomStatus.MAINTENANCE ? RoomStatus.AVAILABLE : RoomStatus.MAINTENANCE;

    updateRoomStatus.mutate({
      roomId,
      status: newStatus,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">Room not found</p>
      </div>
    );
  }

  const activeTenant = (room.tenants as Tenant[])?.find(
    tenant =>
      tenant.status === TenantStatus.ACTIVE &&
      (!tenant.endDate || new Date(tenant.endDate) > new Date())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Room {room.number}</h1>
          <p className="mt-2 text-muted-foreground">{room.property.name}</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleMaintenanceToggle}
            disabled={isUpdating}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
              room.status === RoomStatus.MAINTENANCE
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <Wrench className="h-4 w-4" />
            {room.status === RoomStatus.MAINTENANCE ? 'End Maintenance' : 'Set to Maintenance'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="mt-1 font-medium text-foreground">{room.status}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="mt-1 font-medium text-foreground">
                Rp {room.price.toLocaleString()} /month
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Tenant</p>
              <p className="mt-1 font-medium text-foreground">
                {activeTenant ? activeTenant.name : 'No tenant'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Room Type</p>
              <p className="mt-1 font-medium text-foreground">{room.type}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Room Details</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Size</p>
              <p className="mt-1 text-foreground">{room.size} m²</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amenities</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {room.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Tenant History</h2>
          <div className="space-y-4">
            {room.tenants && room.tenants.length > 0 ? (
              (room.tenants as Tenant[]).map(tenant => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tenant.startDate!).toLocaleDateString()} -{' '}
                      {tenant.endDate ? new Date(tenant.endDate).toLocaleDateString() : 'Present'}
                    </p>
                  </div>
                  <Link
                    href={`/tenants/${tenant.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View Details
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">No tenant history</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
