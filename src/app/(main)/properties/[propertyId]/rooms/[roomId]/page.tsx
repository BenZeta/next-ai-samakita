'use client';

import { api } from '@/lib/trpc/react';
import { ExpenseCategory, RoomStatus, TenantStatus } from '@prisma/client';
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
  const propertyId = params.propertyId as string;
  const roomId = params.roomId as string;
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [maintenanceExpense, setMaintenanceExpense] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const { data: room, isLoading } = api.room.get.useQuery({ id: roomId });
  const utils = api.useContext();

  const updateRoomStatus = api.room.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Room status updated successfully');
      utils.room.get.invalidate({ id: roomId });
      utils.maintenance.getStats.invalidate();
      if (room?.status !== RoomStatus.MAINTENANCE) {
        setShowExpenseForm(true);
      } else {
        setIsUpdating(false);
      }
    },
    onError: error => {
      toast.error(error.message);
      setIsUpdating(false);
    },
  });

  const createExpense = api.expense.create.useMutation({
    onSuccess: () => {
      toast.success('Maintenance expense added successfully');
      setShowExpenseForm(false);
      setIsUpdating(false);
      utils.expense.list.invalidate();
      utils.finance.getStats.invalidate();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleMaintenanceToggle = async () => {
    if (!room) return;
    setShowMaintenanceModal(true);
  };

  const confirmMaintenanceToggle = async () => {
    if (!room) return;
    setIsUpdating(true);
    setShowMaintenanceModal(false);

    const newStatus =
      room.status === RoomStatus.MAINTENANCE ? RoomStatus.AVAILABLE : RoomStatus.MAINTENANCE;

    if (newStatus === RoomStatus.AVAILABLE) {
      updateRoomStatus.mutate({
        roomId,
        status: newStatus,
      });
    } else {
      setShowExpenseForm(true);
      setIsUpdating(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceExpense.amount || !maintenanceExpense.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsUpdating(true);

    await updateRoomStatus.mutateAsync({
      roomId,
      status: RoomStatus.MAINTENANCE,
      description: maintenanceExpense.description,
    });

    await createExpense.mutateAsync({
      propertyId,
      category: ExpenseCategory.MAINTENANCE,
      amount: parseFloat(maintenanceExpense.amount),
      date: new Date(maintenanceExpense.date),
      description: maintenanceExpense.description,
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
          <Link
            href={`/properties/${propertyId}/rooms/${roomId}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent"
          >
            Edit Room
          </Link>
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

      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowMaintenanceModal(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center">
              <div className="mr-4 rounded-full bg-primary/10 p-3">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-card-foreground">
                {room?.status === RoomStatus.MAINTENANCE
                  ? 'End Maintenance'
                  : 'Set Room to Maintenance'}
              </h3>
            </div>
            <p className="mb-6 text-muted-foreground">
              {room?.status === RoomStatus.MAINTENANCE
                ? 'Are you sure you want to mark this room as available? This will end the maintenance period.'
                : 'Are you sure you want to set this room to maintenance? This will mark the room as unavailable.'}
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={confirmMaintenanceToggle}
                disabled={isUpdating}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowExpenseForm(false)} />
          <div className="relative z-50 w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-card-foreground">Add Maintenance Expense</h3>
              <button
                onClick={() => setShowExpenseForm(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Amount</label>
                <input
                  type="number"
                  value={maintenanceExpense.amount}
                  onChange={e =>
                    setMaintenanceExpense({ ...maintenanceExpense, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={maintenanceExpense.description}
                  onChange={e =>
                    setMaintenanceExpense({ ...maintenanceExpense, description: e.target.value })
                  }
                  placeholder="Enter maintenance details"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">Date</label>
                <input
                  type="date"
                  value={maintenanceExpense.date}
                  onChange={e =>
                    setMaintenanceExpense({ ...maintenanceExpense, date: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseForm(false);
                    setIsUpdating(false);
                  }}
                  className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={createExpense.isLoading}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {createExpense.isLoading ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
