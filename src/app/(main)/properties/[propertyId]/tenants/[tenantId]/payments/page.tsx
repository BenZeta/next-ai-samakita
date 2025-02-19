'use client';

import { PaymentList } from '@/components/tenant/PaymentList';
import { api } from '@/lib/trpc/react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

export default function TenantPaymentsPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const tenantId = params.tenantId as string;
  const t = useTranslations();

  const { data: tenant, isLoading } = api.tenant.detail.useQuery({ id: tenantId });

  if (isLoading) {
    return <div className="text-center">{t('properties.tenant.payments.loading')}</div>;
  }

  if (!tenant) {
    return <div className="text-center">{t('properties.tenant.payments.notFound')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('properties.tenant.payments.title')}: {tenant.name}</h1>
        <p className="mt-2 text-gray-600">{t('properties.tenant.payments.room')} {tenant.room.number}</p>
      </div>

      <div className="mx-auto max-w-6xl">
        <PaymentList tenantId={tenantId} />
      </div>
    </div>
  );
}
