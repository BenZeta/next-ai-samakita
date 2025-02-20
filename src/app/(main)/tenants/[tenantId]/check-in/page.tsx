'use client';

import { CheckInForm } from '@/components/tenant/CheckInForm';
import { api } from '@/lib/trpc/react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

export default function TenantCheckInPage() {
  const t = useTranslations();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const { data: tenant, isLoading } = api.tenant.detail.useQuery({ id: tenantId });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-primary"></div>
      </div>
    );
  }

  if (!tenant) {
    return <div className="text-center text-muted-foreground">{t('tenants.details.notFound')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-foreground">
        {t('tenants.details.checkInItems')}
      </h1>
      <div className="mx-auto max-w-3xl">
        <CheckInForm tenantId={tenant.id} />
      </div>
    </div>
  );
}
