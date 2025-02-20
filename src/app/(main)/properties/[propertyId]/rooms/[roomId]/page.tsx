'use client';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/trpc/react';
import { ExpenseCategory, RoomStatus, TenantStatus } from '@prisma/client';
import { Building2, DollarSign, PencilIcon, Users, WrenchIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';

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
  const t = useTranslations('properties.pages.room');

  const { data: room, isLoading } = api.room.get.useQuery({
    id: roomId,
  });
  const utils = api.useContext();

  const updateRoomStatus = api.room.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t('toast.statusUpdated'));
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
      toast.success(t('toast.expenseAdded'));
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
      toast.error(t('toast.fillRequired'));
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
      category: ExpenseCategory.REPAIRS,
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
        <p className="text-muted-foreground">{t('notFound')}</p>
      </div>
    );
  }

  const currentTenant = room.tenants.length > 0 ? room.tenants[0] : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{room.property.name}</p>
        </div>
        <div className="flex gap-4">
          <Link
            href={`/properties/${propertyId}/rooms/${roomId}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent"
          >
            <PencilIcon className="h-4 w-4" />
            {t('edit.title')}
          </Link>
          <Button
            onClick={handleMaintenanceToggle}
            disabled={isUpdating}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
              room.status === RoomStatus.MAINTENANCE
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <WrenchIcon className="h-4 w-4" />
            {room.status === RoomStatus.MAINTENANCE ? t('endMaintenance') : t('setMaintenance')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('form.status.status')}</p>
              <p className="mt-1 font-medium text-foreground">
                {t(`form.status.${room.status.toLowerCase()}`)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('form.price')}</p>
              <p className="mt-1 font-medium text-foreground">
                {t('form.priceValue', { value: room.price })}
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
              <p className="text-sm text-muted-foreground">{t('currentTenant')}</p>
              <p className="mt-1 font-medium text-foreground">
                {currentTenant ? currentTenant.name : t('noTenant')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">{t('tenantHistory')}</h2>
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
                      {tenant.endDate
                        ? new Date(tenant.endDate).toLocaleDateString()
                        : t('present')}
                    </p>
                  </div>
                  <Link
                    href={`/tenants/${tenant.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('viewDetails')}
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">{t('noTenantHistory')}</p>
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
            <h3 className="mb-4 text-lg font-medium">
              {room.status === RoomStatus.MAINTENANCE
                ? t('maintenance.endTitle')
                : t('maintenance.startTitle')}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {room.status === RoomStatus.MAINTENANCE
                ? t('maintenance.endMessage')
                : t('maintenance.startMessage')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                {t('maintenance.cancel')}
              </button>
              <button
                onClick={confirmMaintenanceToggle}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t('maintenance.confirm')}
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
              <h3 className="text-lg font-medium text-card-foreground">{t('expense.title')}</h3>
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
                <label className="block text-sm font-medium text-muted-foreground">
                  {t('expense.amount')}
                </label>
                <input
                  type="number"
                  value={maintenanceExpense.amount}
                  onChange={e =>
                    setMaintenanceExpense({ ...maintenanceExpense, amount: e.target.value })
                  }
                  placeholder={t('expense.amountPlaceholder')}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  {t('expense.description')}
                </label>
                <textarea
                  value={maintenanceExpense.description}
                  onChange={e =>
                    setMaintenanceExpense({ ...maintenanceExpense, description: e.target.value })
                  }
                  placeholder={t('expense.descriptionPlaceholder')}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  {t('expense.date')}
                </label>
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
                  {t('expense.skip')}
                </button>
                <button
                  type="submit"
                  disabled={createExpense.isLoading}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {createExpense.isLoading ? t('expense.adding') : t('expense.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
