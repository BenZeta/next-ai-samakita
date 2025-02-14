"use client";

import { TenantForm } from "@/components/tenant/TenantForm";
import { useParams } from "next/navigation";

export default function NewTenantPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Add New Tenant</h1>
      <div className="rounded-lg bg-white p-6 shadow">
        <TenantForm roomId={roomId} />
      </div>
    </div>
  );
}
