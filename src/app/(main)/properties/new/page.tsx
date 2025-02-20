'use client';

import { PropertyForm } from '@/components/property/PropertyForm';
import { useTranslations } from 'use-intl';

export default function NewPropertyPage() {
  const t = useTranslations('properties');

  return (
    <div className="container mx-auto px-2 py-4 sm:px-4 sm:py-8">
      <h1 className="mb-4 text-xl font-bold sm:mb-8 sm:text-2xl">{t('pages.new.title')}</h1>
      <div className="mx-auto max-w-3xl">
        <PropertyForm />
      </div>
    </div>
  );
}
