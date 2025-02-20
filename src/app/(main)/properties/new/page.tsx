'use client';

import { PropertyForm } from '@/components/property/PropertyForm';
import { useTranslations } from 'use-intl';

export default function NewPropertyPage() {
  const t = useTranslations('properties');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">{t('pages.new.title')}</h1>
      <div className="mx-auto max-w-3xl">
        <PropertyForm />
      </div>
    </div>
  );
}
