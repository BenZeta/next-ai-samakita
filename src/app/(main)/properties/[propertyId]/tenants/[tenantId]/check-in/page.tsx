'use client';

import { CheckInForm } from '@/components/tenant/CheckInForm';
import { api } from '@/lib/trpc/react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

export default function TenantCheckInPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const tenantId = params.tenantId as string;
  const t = useTranslations();

  const { data: tenant, isLoading } = api.tenant.detail.useQuery({ id: tenantId });

  if (isLoading) {
    return <div className="text-center">{t('properties.tenant.checkIn.loading')}</div>;
  }

  if (!tenant) {
    return <div className="text-center">{t('properties.tenant.checkIn.notFound')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('properties.tenant.checkIn.title')}: {tenant.name}</h1>
        <p className="mt-2 text-gray-600">{t('properties.tenant.checkIn.room')} {tenant.room.number}</p>
      </div>

      <div className="mx-auto max-w-3xl">
        <CheckInForm tenantId={tenantId} />
      </div>
    </div>
  );
}
