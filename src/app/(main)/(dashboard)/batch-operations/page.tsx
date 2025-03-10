'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Layers, MessageSquare, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'use-intl';

export default function BatchOperationsPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Layers className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
          {t('batchOperations.title')}
        </h1>
      </div>

      <p className="mb-8 text-sm text-muted-foreground sm:text-base">
        {t('batchOperations.description')}
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Batch Payment Generation */}
        <Link
          href="/batch-operations/payments"
          className="block transition-transform hover:scale-[1.02]"
        >
          <Card className="h-full overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-base sm:text-lg">
                {t('batchOperations.payments.title')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('batchOperations.payments.description')}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Bulk Billing Creation */}
        <Card className="h-full overflow-hidden opacity-70">
          <CardHeader className="p-4 sm:p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-base sm:text-lg">
              {t('batchOperations.billing.title')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t('batchOperations.billing.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="rounded-md bg-muted px-3 py-2 text-center text-xs font-medium text-muted-foreground sm:text-sm">
              {t('batchOperations.billing.comingSoon')}
            </div>
          </CardContent>
        </Card>

        {/* Batch Maintenance Requests */}
        <Card className="h-full overflow-hidden opacity-70">
          <CardHeader className="p-4 sm:p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-base sm:text-lg">
              {t('batchOperations.maintenance.title')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t('batchOperations.maintenance.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="rounded-md bg-muted px-3 py-2 text-center text-xs font-medium text-muted-foreground sm:text-sm">
              {t('batchOperations.maintenance.comingSoon')}
            </div>
          </CardContent>
        </Card>

        {/* Bulk Tenant Communications */}
        <Card className="h-full overflow-hidden opacity-70">
          <CardHeader className="p-4 sm:p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-base sm:text-lg">
              {t('batchOperations.communication.title')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t('batchOperations.communication.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="rounded-md bg-muted px-3 py-2 text-center text-xs font-medium text-muted-foreground sm:text-sm">
              {t('batchOperations.communication.comingSoon')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
