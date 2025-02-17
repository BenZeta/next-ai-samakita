'use client';

import { PaymentList } from '@/components/tenant/PaymentList';
import { api } from '@/lib/trpc/react';
import { useParams } from 'next/navigation';

export default function TenantPaymentsPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Payments: {tenant.name}</h1>
        <p className="mt-2 text-gray-600">Room {tenant.room.number}</p>
      </div>

      <div className="mx-auto max-w-6xl">
        <PaymentList tenantId={tenantId} />
      </div>
    </div>
  );
}
