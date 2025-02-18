'use client';

import { CheckInForm } from '@/components/tenant/CheckInForm';
import { api } from '@/lib/trpc/react';
import { useParams } from 'next/navigation';

export default function TenantCheckInPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const { data: tenant, isLoading } = api.tenant.detail.useQuery({ id: tenantId });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted border-t-primary"></div>
      </div>
    );
  }

  if (!tenant) {
    return <div className="text-center text-muted-foreground">Tenant not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-foreground">Check-in Items</h1>
      <div className="mx-auto max-w-3xl">
        <CheckInForm tenantId={tenant.id} />
      </div>
    </div>
  );
}
