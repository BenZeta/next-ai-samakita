'use client';

import { api } from '@/lib/trpc/react';
import { Building2, Calendar, DollarSign, Send } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export default function BillingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const billingId = params.id as string;

  const { data: billing, isLoading } = api.billing.get.useQuery({ id: billingId });

  const sendBillingMutation = api.billing.send.useMutation({
    onSuccess: () => {
      toast.success('Billing sent successfully!');
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleSendBilling = async () => {
    try {
      await sendBillingMutation.mutateAsync({ id: billingId });
    } catch (error) {
      console.error('Failed to send billing:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-muted-foreground">Billing not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{billing.title}</h1>
        {billing.status === 'DRAFT' && (
          <button
            onClick={handleSendBilling}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Send className="h-4 w-4" />
            Send Billing
          </button>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg bg-card p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-foreground">Billing Details</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium text-foreground">
                    Rp {billing.amount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium text-foreground">
                    {new Date(billing.dueDate).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tenant</p>
                  <p className="font-medium text-foreground">
                    {billing.tenant?.name} - Room {billing.tenant?.room.number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {billing.tenant?.room.property.name}
                  </p>
                </div>
              </div>

              {billing.description && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">{billing.description}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-card p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-foreground">Status</h2>
            <div
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                billing.status === 'DRAFT'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500'
              }`}
            >
              {billing.status}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow">
          <h2 className="mb-4 text-lg font-medium text-foreground">Payments</h2>
          {billing.payments.length > 0 ? (
            <div className="space-y-4">
              {billing.payments.map(payment => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border border-input p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {payment.tenant.name} - Room {payment.tenant.room.number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.tenant.room.property.name}
                    </p>
                  </div>
                  <div
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      payment.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500'
                        : payment.status === 'PAID'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500'
                    }`}
                  >
                    {payment.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No payments yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
