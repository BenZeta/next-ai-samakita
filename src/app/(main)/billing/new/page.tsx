'use client';

import { api } from '@/lib/trpc/react';
import { PaymentType } from '@prisma/client';
import { Building2, CreditCard, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';

export default function NewBillingPage() {
  const router = useRouter();
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const searchParams = useSearchParams();
  const initialTenantId = searchParams.get('tenantId');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(initialTenantId);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<PaymentType>(PaymentType.RENT);

  const { data: properties, isLoading: propertiesLoading } = api.property.list.useQuery({
    search,
  });

  // If we have an initial tenant ID, fetch their details to get the property ID
  const { data: initialTenant } = api.tenant.detail.useQuery(
    { id: initialTenantId || '' },
    { enabled: !!initialTenantId }
  );

  // Set the initial property ID when we get the tenant details
  useEffect(() => {
    if (initialTenant && !selectedPropertyId) {
      setSelectedPropertyId(initialTenant.room.propertyId);
    }
  }, [initialTenant, selectedPropertyId]);

  const { data: tenants, isLoading: tenantsLoading } = api.tenant.list.useQuery(
    {
      propertyId: selectedPropertyId || undefined,
      status: 'ACTIVE',
      search: '',
    },
    {
      enabled: !propertiesLoading,
    }
  );

  const createBillingMutation = api.billing.create.useMutation({
    onSuccess: () => {
      toast.success(t('billing.new.success'));
      router.push('/billing');
    },
    onError: error => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createBillingMutation.mutateAsync({
        title,
        description,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        tenantId: selectedTenantId || undefined,
        type,
      });
    } catch (error) {
      console.error('Failed to create billing:', error);
    }
  };

  const handleAutoFillRent = () => {
    const selectedTenant = initialTenant || tenants?.find(t => t.id === selectedTenantId);
    if (!selectedTenant) return;

    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const dueDate = new Date(nextMonth.setDate(5)); // Set due date to 5th of next month

    setTitle(t('billing.type.RENT'));
    setDescription(
      t('billing.new.form.rentDescription', {
        room: selectedTenant.room.number,
        month: nextMonth.toLocaleString('default', { month: 'long' }),
        year: nextMonth.getFullYear(),
      })
    );
    setAmount(selectedTenant.rentAmount?.toString() || '');
    setDueDate(dueDate.toISOString().split('T')[0]);
    setType(PaymentType.RENT);
  };

  if (propertiesLoading || tenantsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-foreground">{t('billing.new.title')}</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h2 className="mb-4 text-lg font-medium text-foreground">
            {t('billing.new.property.title')}
          </h2>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('billing.new.property.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 pl-10 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div
              className={`cursor-pointer rounded-lg bg-card p-6 shadow transition-all hover:shadow-lg ${
                !selectedPropertyId ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => {
                setSelectedPropertyId(null);
                setSelectedTenantId(null);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    {t('billing.new.property.allProperties')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('billing.new.property.allPropertiesHint')}
                  </p>
                </div>
              </div>
            </div>

            {properties?.properties.map(property => (
              <div
                key={property.id}
                className={`cursor-pointer rounded-lg bg-card p-6 shadow transition-all hover:shadow-lg ${
                  selectedPropertyId === property.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => {
                  setSelectedPropertyId(property.id);
                  setSelectedTenantId(null);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{property.name}</h3>
                    <p className="text-sm text-muted-foreground">{property.address}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedPropertyId && tenants && tenants.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-medium text-foreground">
              {t('billing.new.tenant.title')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tenants.map(tenant => (
                <div
                  key={tenant.id}
                  className={`cursor-pointer rounded-lg bg-card p-6 shadow transition-all hover:shadow-lg ${
                    selectedTenantId === tenant.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedTenantId(tenant.id)}
                >
                  <div>
                    <h3 className="font-medium text-foreground">{tenant.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('billing.new.tenant.room')} {tenant.room.number}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {selectedTenantId && (
            <button
              type="button"
              onClick={handleAutoFillRent}
              className="mb-4 inline-flex items-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {t('billing.new.form.autoFillRent')}
            </button>
          )}

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-foreground">
              {t('billing.new.form.type')}
            </label>
            <select
              id="type"
              value={type}
              onChange={e => setType(e.target.value as PaymentType)}
              className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {Object.values(PaymentType).map(type => (
                <option key={type} value={type}>
                  {t(`billing.type.${type}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground">
              {t('billing.new.form.title')}
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground">
              {t('billing.new.form.description')}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-foreground">
              {t('billing.new.form.amount')}
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              min="0"
              step="0.01"
              className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-foreground">
              {t('billing.new.form.dueDate')}
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? t('billing.new.form.submitting') : t('billing.new.form.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
