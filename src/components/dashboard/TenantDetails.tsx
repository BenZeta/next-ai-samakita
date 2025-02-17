import { api } from '@/lib/trpc/react';
import type { Tenant } from '@prisma/client';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function TenantDetails({ tenant }: { tenant: Tenant }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const utils = api.useContext();
  const extendLease = api.tenant.extendLease.useMutation({
    onSuccess: () => {
      toast.success('Lease extended successfully');
      utils.tenant.get.invalidate({ id: tenant.id });
      setShowConfirmation(false);
    },
    onError: error => {
      toast.error(error.message);
      setShowConfirmation(false);
    },
  });

  return (
    <div>
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => setShowConfirmation(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          Extend Lease
        </button>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-card-foreground">
              Confirm Lease Extension
            </h3>
            <p className="mb-6 text-muted-foreground">
              Are you sure you want to extend {tenant.name}'s lease by one month? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                Cancel
              </button>
              <button
                onClick={() => extendLease.mutate({ tenantId: tenant.id })}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                Confirm Extension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
