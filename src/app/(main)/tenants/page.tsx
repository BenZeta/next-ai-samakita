'use client';

import { api } from '@/lib/trpc/react';
import { PaymentMethod, TenantStatus } from '@prisma/client';
import { Building2, CreditCard, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function TenantsPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: tenants, isLoading } = api.tenant.list.useQuery({});
  const sendInvoiceMutation = api.tenant.sendInvoice.useMutation({
    onSuccess: () => {
      toast.success('Invoice sent successfully!');
      setShowPaymentModal(false);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleSendInvoice = (tenantId: string, method: PaymentMethod) => {
    sendInvoiceMutation.mutate({ tenantId, paymentMethod: method });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Tenants</h1>
        <Link
          href="/tenants/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add New Tenant
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tenants?.map(tenant => (
          <div key={tenant.id} className="rounded-lg bg-card p-6 shadow dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-card-foreground">{tenant.name}</h3>
                  <p className="text-sm text-muted-foreground">Room {tenant.room.number}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  tenant.status === TenantStatus.ACTIVE
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {tenant.status}
              </span>
            </div>

            <div className="mb-4 space-y-2">
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

            <div className="flex space-x-2">
              <Link
                href={`/tenants/${tenant.id}`}
                className="flex-1 rounded-md bg-background px-4 py-2 text-center text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent"
              >
                View Details
              </Link>
              <button
                onClick={() => {
                  setSelectedTenantId(tenant.id);
                  setShowPaymentModal(true);
                }}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Send Invoice
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Method Modal */}
      {showPaymentModal && selectedTenantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-medium">Select Payment Method</h2>
            <div className="space-y-4">
              <button
                onClick={() => handleSendInvoice(selectedTenantId, PaymentMethod.MANUAL)}
                className="w-full rounded-md bg-white px-4 py-2 text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Manual Bank Transfer
              </button>
              <button
                onClick={() => handleSendInvoice(selectedTenantId, PaymentMethod.STRIPE)}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                Pay with Stripe
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
