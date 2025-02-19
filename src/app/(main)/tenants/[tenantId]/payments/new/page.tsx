'use client';

import { PaymentForm } from '@/components/payment/PaymentForm';
import { api } from '@/lib/trpc/react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function NewPaymentPage() {
  const t = useTranslations();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const { data: tenant, isLoading } = api.tenant.detail.useQuery({ id: tenantId });

  if (isLoading) {
    return <div className="text-center text-muted-foreground">{t('common.loading')}</div>;
  }

  if (!tenant) {
    return <div className="text-center text-muted-foreground">{t('tenants.details.notFound')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">{t('tenants.details.payments.addPayment')}</h1>
      <div className="mb-6">
        <p className="text-muted-foreground">
          {t('tenants.details.tenant')}: {tenant.name} - {t('tenants.details.room')} {tenant.room.number}
        </p>
      </div>
      <div className="rounded-lg bg-card p-6 shadow">
        <PaymentForm tenantId={tenantId} />
      </div>
    </div>
  );
}
