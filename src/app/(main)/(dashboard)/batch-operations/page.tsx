'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'use-intl';

export default function BatchOperationsPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
          {t('batchOperations.title')}
        </h1>
      </div>

      <Card className="mx-auto max-w-3xl text-center py-16">
        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-6">
            <Construction className="h-16 w-16 text-primary opacity-60" />

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">{t('common.comingSoon')}</h2>
              <p className="text-muted-foreground">
                {t('batchOperations.comingSoonDescription')}
                <br />
                {t('batchOperations.checkBackLater')}
              </p>
            </div>

            <Link href="/" className="text-primary hover:underline">
              {t('common.returnToDashboard')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
