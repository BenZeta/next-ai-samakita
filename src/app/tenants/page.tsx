"use client";

import { TenantList } from "@/components/tenant/TenantList";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function TenantsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="mt-2 text-gray-600">Manage all your tenants across properties</p>
        </div>
        <Link
          href="/tenants/new"
          className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          <Plus className="mr-2 h-5 w-5" />
          Add Tenant
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <TenantList showAddButton={false} />
      </div>
    </div>
  );
}
