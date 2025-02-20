'use client';

import { ExpenseList } from '@/components/expense/ExpenseList';
import { useParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

export default function ExpensesPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const t = useTranslations('expenses');

  if (!propertyId) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 text-center">
        <p className="text-base font-medium text-muted-foreground sm:text-lg">
          {t('noPropertyId')}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-[calc(100vh-4rem)] space-y-4 px-2 py-4 sm:space-y-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
        <ExpenseList propertyId={propertyId} />
      </div>
    </div>
  );
}
