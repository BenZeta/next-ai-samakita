'use client';

import { CheckInForm } from '@/components/tenant/CheckInForm';
import { api } from '@/lib/trpc/react';
import { useParams } from 'next/navigation';

export default function TenantCheckInPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const { data: tenant, isLoading } = api.tenant.detail.useQuery({ id: tenantId });

  if (isLoading) {
    return <div className="text-center">Loading tenant details...</div>;
  }

  if (!tenant) {
    return <div className="text-center">Tenant not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Check-in Items</h1>
      <div className="mx-auto max-w-3xl">
        <CheckInForm tenantId={tenant.id} />
      </div>
    </div>
  );
}
