"use client";

import { api } from "@/lib/trpc/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PaymentList } from "@/components/payment/PaymentList";
import { Plus } from "lucide-react";
import { PaymentType } from "@prisma/client";

interface TenantPaymentsPageProps {
  params: {
    tenantId: string;
  };
}

export default function TenantPaymentsPage({ params: { tenantId } }: TenantPaymentsPageProps) {
  const { data: tenant, isLoading } = api.tenant.get.useQuery({ id: tenantId });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!tenant) {
    return <div>Tenant not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="mt-2 text-gray-600">
            Tenant: {tenant.name} - Room {tenant.room.number}
          </p>
        </div>
        <Link
          href={`/tenants/${tenantId}/payments/new`}
          className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          <Plus className="mr-2 h-5 w-5" />
          Add Payment
        </Link>
      </div>

      <PaymentList tenantId={tenantId} paymentType={PaymentType.RENT} />
    </div>
  );
}
