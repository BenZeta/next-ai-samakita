'use client';

import { api } from '@/lib/trpc/react';
import { TenantStatus } from '@prisma/client';
import { Building2, CreditCard, Mail, Phone, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function ConfirmationModal({ isOpen, onClose, onConfirm }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center">
          <div className="mr-4 rounded-full bg-destructive/10 p-3">
            <UserX className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-medium text-card-foreground">Deactivate Tenant</h3>
        </div>
        <p className="mb-6 text-muted-foreground">
          Are you sure you want to deactivate this tenant? This action will mark the tenant as
          inactive and may affect related records.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenantDetailPage({ params }: { params: { tenantId: string } }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: tenant, isLoading } = api.tenant.detail.useQuery({ id: params.tenantId });
  const updateMutation = api.tenant.update.useMutation({
    onSuccess: () => {
      toast.success('Tenant status updated successfully');
      router.refresh();
      setIsModalOpen(false);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-muted-foreground">Tenant not found</p>
      </div>
    );
  }

  const handleDeactivate = () => {
    updateMutation.mutate({
      id: tenant.id,
      status: TenantStatus.INACTIVE,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Tenant Details</h1>
        {tenant.status === TenantStatus.ACTIVE && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            <UserX className="h-4 w-4" />
            Deactivate Tenant
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-card p-6 shadow">
          <div className="mb-6 flex items-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-card-foreground">{tenant.name}</h3>
              <p className="text-sm text-muted-foreground">Room {tenant.room.number}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center text-muted-foreground">
              <Mail className="mr-2 h-4 w-4" />
              {tenant.email}
            </div>
            <div className="flex items-center text-muted-foreground">
              <Phone className="mr-2 h-4 w-4" />
              {tenant.phone}
            </div>
            <div className="flex items-center text-muted-foreground">
              <CreditCard className="mr-2 h-4 w-4" />
              Rp {tenant.room.price.toLocaleString()} /month
            </div>
          </div>

          <div className="mt-6">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                tenant.status === TenantStatus.ACTIVE
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {tenant.status}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow">
          <h3 className="mb-4 text-lg font-medium text-card-foreground">Property Details</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Property Name</p>
              <p className="text-foreground">{tenant.room.property.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="text-foreground">{tenant.room.property.address}</p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
