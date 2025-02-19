'use client';

import { api } from '@/lib/trpc/react';
import { Building2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function NewBillingPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { data: properties, isLoading: propertiesLoading } = api.property.list.useQuery({
    search,
  });

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
      toast.success('Billing created successfully!');
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
      });
    } catch (error) {
      console.error('Failed to create billing:', error);
    }
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
      <h1 className="mb-8 text-3xl font-bold text-foreground">Create New Billing</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h2 className="mb-4 text-lg font-medium text-foreground">Select Property (Optional)</h2>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search properties..."
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
                  <h3 className="font-medium text-foreground">All Properties</h3>
                  <p className="text-sm text-muted-foreground">Send billing to all tenants</p>
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
            <h2 className="mb-4 text-lg font-medium text-foreground">Select Tenant (Optional)</h2>
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
                    <p className="text-sm text-muted-foreground">Room {tenant.room.number}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground">
              Title
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
              Description (Optional)
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
              Amount
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
              Due Date
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
            {isLoading ? 'Creating...' : 'Create Billing'}
          </button>
        </div>
      </form>
    </div>
  );
}
