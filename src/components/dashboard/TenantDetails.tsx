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
      {/* ... existing tenant details ... */}

      <div className="mt-6 flex items-center gap-4">
        {/* ... existing buttons ... */}

        <button
          onClick={() => setShowConfirmation(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Extend Lease
        </button>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Confirm Lease Extension</h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to extend {tenant.name}'s lease by one month? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => extendLease.mutate({ tenantId: tenant.id })}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
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
