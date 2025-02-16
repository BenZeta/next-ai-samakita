"use client";

import { api } from "@/lib/trpc/react";
import { useParams } from "next/navigation";
import { PaymentForm } from "@/components/payment/PaymentForm";

export default function NewPaymentPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const { data: tenant, isLoading } = api.tenant.get.useQuery({ id: tenantId });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!tenant) {
    return <div>Tenant not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Add New Payment</h1>
      <div className="mb-6">
        <p className="text-gray-600">
          Tenant: {tenant.name} - Room {tenant.room.number}
        </p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <PaymentForm tenantId={tenantId} />
      </div>
    </div>
  );
}
