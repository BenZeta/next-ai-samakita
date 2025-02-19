'use client';

import { api } from '@/lib/trpc/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

const checkInItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  condition: z.string().min(1, 'Condition is required'),
  notes: z.string().optional(),
});

type CheckInItemFormData = z.infer<typeof checkInItemSchema>;

interface CheckInFormProps {
  tenantId: string;
}

interface CheckInItem {
  id: string;
  itemName: string;
  condition: string;
  notes?: string | null;
}

export function CheckInForm({ tenantId }: CheckInFormProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');

  const COMMON_ITEMS = [
    { key: 'keys', label: t('tenants.checkIn.form.commonItems.keys') },
    { key: 'doorLock', label: t('tenants.checkIn.form.commonItems.doorLock') },
    { key: 'windows', label: t('tenants.checkIn.form.commonItems.windows') },
    { key: 'lights', label: t('tenants.checkIn.form.commonItems.lights') },
    { key: 'airConditioner', label: t('tenants.checkIn.form.commonItems.airConditioner') },
    { key: 'fan', label: t('tenants.checkIn.form.commonItems.fan') },
    { key: 'bed', label: t('tenants.checkIn.form.commonItems.bed') },
    { key: 'mattress', label: t('tenants.checkIn.form.commonItems.mattress') },
    { key: 'wardrobe', label: t('tenants.checkIn.form.commonItems.wardrobe') },
    { key: 'desk', label: t('tenants.checkIn.form.commonItems.desk') },
    { key: 'chair', label: t('tenants.checkIn.form.commonItems.chair') },
    { key: 'bathroomFixtures', label: t('tenants.checkIn.form.commonItems.bathroomFixtures') },
  ];

  const COMMON_CONDITIONS = [
    { key: 'excellent', label: t('tenants.checkIn.form.conditions.excellent') },
    { key: 'good', label: t('tenants.checkIn.form.conditions.good') },
    { key: 'fair', label: t('tenants.checkIn.form.conditions.fair') },
    { key: 'poor', label: t('tenants.checkIn.form.conditions.poor') },
    { key: 'needsRepair', label: t('tenants.checkIn.form.conditions.needsRepair') },
  ];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CheckInItemFormData>({
    resolver: zodResolver(checkInItemSchema),
  });

  const { data: checkInItems, refetch } = api.tenant.detail.useQuery(
    { id: tenantId },
    {
      select: data => data.checkInItems,
    }
  );

  const addCheckInItemMutation = api.tenant.addCheckInItem.useMutation({
    onSuccess: () => {
      toast.success(t('tenants.checkIn.form.success'));
      reset();
      refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: CheckInItemFormData) => {
    setIsLoading(true);
    try {
      await addCheckInItemMutation.mutateAsync({
        tenantId,
        ...data,
      });
    } catch (error) {
      console.error('Failed to add check-in item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground">{t('tenants.checkIn.form.itemName')}</label>
          <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {COMMON_ITEMS.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSelectedItem(item.label)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  selectedItem === item.label
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent text-accent-foreground hover:bg-accent/80'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            {...register('itemName')}
            value={selectedItem}
            onChange={e => setSelectedItem(e.target.value)}
            placeholder={t('tenants.checkIn.form.itemNamePlaceholder')}
            className="mt-2 block w-full rounded-md border border-input bg-background px-4 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.itemName && (
            <p className="mt-1 text-sm text-destructive">{t('tenants.checkIn.form.validation.itemName')}</p>
          )}
        </div>

        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-muted-foreground">
            {t('tenants.checkIn.form.condition')}
          </label>
          <select
            id="condition"
            {...register('condition')}
            className="mt-1 block w-full rounded-md border border-input bg-background px-4 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t('tenants.checkIn.form.conditionPlaceholder')}</option>
            {COMMON_CONDITIONS.map(condition => (
              <option key={condition.key} value={condition.key}>
                {condition.label}
              </option>
            ))}
          </select>
          {errors.condition && (
            <p className="mt-1 text-sm text-destructive">{t('tenants.checkIn.form.validation.condition')}</p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">
            {t('tenants.checkIn.form.notes')}
          </label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            placeholder={t('tenants.checkIn.form.notesPlaceholder')}
            className="mt-1 block w-full rounded-md border border-input bg-background px-4 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.notes && <p className="mt-1 text-sm text-destructive">{errors.notes.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {isLoading ? t('tenants.checkIn.form.adding') : t('tenants.checkIn.form.addButton')}
        </button>
      </form>

      <div>
        <h3 className="text-lg font-medium text-foreground">{t('tenants.checkIn.form.items.title')}</h3>
        <div className="mt-4 space-y-4">
          {checkInItems?.map((item: CheckInItem) => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">{item.itemName}</h4>
                  <p className="text-sm text-muted-foreground">{t('tenants.checkIn.form.items.condition')} {item.condition}</p>
                  {item.notes && <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>}
                </div>
              </div>
            </div>
          ))}

          {checkInItems?.length === 0 && (
            <p className="text-center text-muted-foreground">{t('tenants.checkIn.form.items.noItems')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
