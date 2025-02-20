'use client';

import { api } from '@/lib/trpc/react';
import {
  Building2,
  Calendar,
  DollarSign,
  Mail,
  MessageSquare,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';

export default function BillingDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const t = useTranslations();
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const { data: billing, isLoading } = api.billing.get.useQuery({ id: params.id });
  const utils = api.useContext();

  const sendBillingMutation = api.billing.send.useMutation({
    onSuccess: () => {
      toast.success(t('billing.details.messages.billingSent'));
      utils.billing.get.invalidate({ id: params.id });
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const sendBillingNotificationMutation = api.billing.sendBillingNotification.useMutation({
    onSuccess: () => {
      toast.success(t('billing.details.messages.notificationSent'));
      setShowNotificationModal(false);
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const sendPaymentNotificationMutation = api.billing.sendPaymentNotification.useMutation({
    onSuccess: () => {
      toast.success(t('billing.details.messages.reminderSent'));
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const uploadPaymentProofMutation = api.billing.uploadPaymentProof.useMutation({
    onSuccess: () => {
      toast.success(t('billing.details.upload.success'));
      utils.billing.get.invalidate({ id: params.id });
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleSendBilling = async (method: 'email' | 'whatsapp') => {
    try {
      await sendBillingMutation.mutateAsync({ id: params.id });
      await sendBillingNotificationMutation.mutateAsync({
        billingId: params.id,
        method,
      });
    } catch (error) {
      console.error('Failed to send billing:', error);
    }
  };

  const handleSendPaymentReminder = async (method: 'email' | 'whatsapp', tenantId: string) => {
    try {
      await sendPaymentNotificationMutation.mutateAsync({
        tenantId,
        billingId: params.id,
        method,
      });
    } catch (error) {
      console.error('Failed to send payment reminder:', error);
    }
  };

  const handleUploadProof = async (paymentId: string) => {
    try {
      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      // Handle file selection
      input.onchange = async e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('paymentId', paymentId);

        try {
          // Upload receipt
          const response = await fetch('/api/upload/receipt', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload receipt');
          }

          const { url } = await response.json();

          // Update payment status
          await uploadPaymentProofMutation.mutateAsync({
            paymentId,
            receiptUrl: url,
          });
        } catch (error) {
          console.error('Error uploading proof:', error);
          toast.error(t('billing.details.upload.error'));
        }
      };

      // Trigger file selection
      input.click();
    } catch (error) {
      console.error('Error handling upload:', error);
      toast.error(t('billing.details.upload.error'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-primary"></div>
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-muted-foreground">{t('billing.details.notFound')}</p>
      </div>
    );
  }

  return (
    <>
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">{t('billing.details.notification.title')}</h3>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="rounded-full p-1 hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              {t('billing.details.notification.subtitle')}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleSendBilling('email')}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Mail className="h-4 w-4" />
                {t('billing.details.notification.email')}
              </button>
              <button
                onClick={() => handleSendBilling('whatsapp')}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <MessageSquare className="h-4 w-4" />
                {t('billing.details.notification.whatsapp')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">{billing.title}</h1>
          <div className="flex items-center gap-2">
            {billing.status === 'DRAFT' && (
              <button
                onClick={() => setShowNotificationModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Send className="h-4 w-4" />
                {t('billing.details.sendButton')}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-lg bg-card p-6 shadow">
              <h2 className="mb-4 text-lg font-medium text-foreground">
                {t('billing.details.title')}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('billing.details.amount')}</p>
                    <p className="font-medium text-foreground">
                      Rp{' '}
                      {billing.amount.toLocaleString('id-ID', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('billing.details.dueDate')}</p>
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
                    <p className="text-sm text-muted-foreground">{t('billing.details.tenant')}</p>
                    <p className="font-medium text-foreground">
                      {billing.tenant?.name} - {t('billing.details.room')}{' '}
                      {billing.tenant?.room.number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {billing.tenant?.room.property.name}
                    </p>
                  </div>
                </div>

                {billing.description && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      {t('billing.details.description')}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">
                      {billing.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-card p-6 shadow">
              <h2 className="mb-4 text-lg font-medium text-foreground">
                {t('billing.details.status')}
              </h2>
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  billing.status === 'DRAFT'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500'
                }`}
              >
                {t(`billing.status.${billing.status.toLowerCase()}`)}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg bg-card p-6 shadow">
              <h2 className="mb-4 text-lg font-medium text-foreground">
                {t('billing.details.payments.title')}
              </h2>
              {billing.payments.length > 0 ? (
                <div className="space-y-4">
                  {billing.payments.map(payment => (
                    <div key={payment.id} className="rounded-lg border border-input p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {payment.tenant.name} - {t('billing.details.room')}{' '}
                            {payment.tenant.room.number}
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
                          {t(`billing.status.${payment.status.toLowerCase()}`)}
                        </div>
                      </div>
                      {billing.status === 'SENT' && payment.status !== 'PAID' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSendPaymentReminder('email', payment.tenant.id)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            <Mail className="h-3 w-3" />
                            {t('billing.details.payments.sendReminder')}
                          </button>
                          <button
                            onClick={() => handleSendPaymentReminder('whatsapp', payment.tenant.id)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500 px-3 py-2 text-xs font-medium text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          >
                            <MessageSquare className="h-3 w-3" />
                            {t('billing.details.payments.sendWhatsapp')}
                          </button>
                          <button
                            onClick={() => handleUploadProof(payment.id)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-500 px-3 py-2 text-xs font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                          >
                            <Upload className="h-3 w-3" />
                            {t('billing.details.payments.uploadProof')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  {t('billing.details.payments.noPayments')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
