'use client';

import { TenantForm } from '@/components/tenant/TenantForm';
import { useParams } from 'next/navigation';
import { useTranslations } from 'use-intl';

export default function NewTenantPage() {
  const t = useTranslations();
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-foreground">{t('rooms.tenants.new.title')}</h1>
      <div className="rounded-lg bg-card p-6 shadow">
        <TenantForm roomId={roomId} />
      </div>
    </div>
  );
}
