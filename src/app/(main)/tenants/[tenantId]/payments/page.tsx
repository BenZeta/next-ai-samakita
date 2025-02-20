'use client';

import { api } from '@/lib/trpc/react';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

export default function TenantPaymentsPage() {
  const t = useTranslations();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const { data: tenant, isLoading: tenantLoading } = api.tenant.detail.useQuery({ id: tenantId });
  const { data: billings, isLoading: billingsLoading } = api.billing.list.useQuery({
    search: '',
    propertyId: tenant?.room.propertyId,
  });

  const tenantBillings = billings?.billings.filter(billing => billing.tenantId === tenantId);

  if (tenantLoading || billingsLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-primary"></div>
      </div>
    );
  }

  if (!tenant) {
    return <div>{t('tenants.details.notFound')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{tenant.name}</h1>
          <p className="mt-2 text-muted-foreground">
            {t('tenants.details.roomAt', {
              number: tenant.room.number,
              property: tenant.room.property.name,
            })}
          </p>
        </div>
        <Link
          href={`/billing/new?tenantId=${tenant.id}`}
          className="flex w-[160px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
        >
          <FileText className="mr-2 h-5 w-5" />
          {t('billing.addBilling')}
        </Link>
      </div>

      {!tenantBillings?.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-background p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">{t('billing.noBilling')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('billing.noResults.noFilters')}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tenantBillings.map(billing => (
            <Link
              key={billing.id}
              href={`/billing/${billing.id}`}
              className="rounded-lg bg-card p-6 shadow transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-card-foreground">{billing.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('billing.details.room')} {tenant.room.number}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    billing.status === 'SENT'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : billing.status === 'DRAFT'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {t(`billing.status.${billing.status.toLowerCase()}`)}
                </span>
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('billing.details.amount')}:</span>
                  <span className="font-medium text-foreground">
                    Rp {billing.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('billing.details.dueDate')}:</span>
                  <span className="font-medium text-foreground">
                    {new Date(billing.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
