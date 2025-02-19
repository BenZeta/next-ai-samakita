'use client';

import { PaymentList } from '@/components/payment/PaymentList';
import { api } from '@/lib/trpc/react';
import { PaymentType } from '@prisma/client';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface TenantPaymentsPageProps {
  params: {
    tenantId: string;
  };
}

export default function TenantPaymentsPage({ params: { tenantId } }: TenantPaymentsPageProps) {
  const t = useTranslations();
  const { data: tenant, isLoading } = api.tenant.detail.useQuery({ id: tenantId });

  if (isLoading) {
    return <div className="text-center text-muted-foreground">{t('common.loading')}</div>;
  }

  if (!tenant) {
    return <div className="text-center text-muted-foreground">{t('tenants.details.notFound')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('tenants.details.payments.title')}</h1>
          <p className="mt-2 text-muted-foreground">
          {t('tenants.details.tenant')}: {tenant.name} - {t('tenants.details.room')} {tenant.room.number}
          </p>
        </div>
        <Link
          href={`/tenants/${tenantId}/payments/new`}
          className="flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Plus className="mr-2 h-5 w-5" />
          {t('tenants.details.payments.addPayment')}
        </Link>
      </div>

      <PaymentList tenantId={tenantId} paymentType={PaymentType.RENT} />
    </div>
  );
}
