"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import Link from "next/link";

interface TenantListProps {
  roomId: string;
}

type TenantStatus = "active" | "inactive" | "pending";

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  ktpNumber: string;
  status: TenantStatus;
  startDate: Date;
  endDate: Date;
  references: string[];
  room: {
    property: {
      id: string;
    };
  };
}

export function TenantList({ roomId }: TenantListProps) {
  const [selectedStatus, setSelectedStatus] = useState<TenantStatus | undefined>();
  const [search, setSearch] = useState("");

  const { data: tenants, isLoading } = api.tenant.list.useQuery({
    roomId,
    status: selectedStatus,
    search,
  });

  if (isLoading) {
    return <div className="text-center">Loading tenants...</div>;
  }

  const statusOptions: TenantStatus[] = ["active", "inactive", "pending"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:w-96"
          />

          <select
            value={selectedStatus || ""}
            onChange={(e) => setSelectedStatus(e.target.value as TenantStatus | undefined)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="">All Status</option>
            {statusOptions.map((status) => (
              <option
                key={status}
                value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <Link
          href={`/properties/${roomId}/tenants/new`}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Add Tenant
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tenants?.map((tenant: Tenant) => (
          <div
            key={tenant.id}
            className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{tenant.name}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-sm capitalize ${
                    tenant.status === "active" ? "bg-green-100 text-green-800" : tenant.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                  }`}>
                  {tenant.status.toLowerCase()}
                </span>
              </div>
              <div className="mb-4 space-y-2 text-sm text-gray-600">
                <p>Email: {tenant.email}</p>
                <p>Phone: {tenant.phone}</p>
                <p>KTP: {tenant.ktpNumber}</p>
                <p>
                  Period: {new Date(tenant.startDate).toLocaleDateString()} - {new Date(tenant.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">References:</h4>
                <div className="flex flex-wrap gap-2">
                  {tenant.references.map((reference, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      {reference}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <Link
                  href={`/properties/${roomId}/tenants/${tenant.id}/edit`}
                  className="rounded px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50">
                  Edit
                </Link>
                <Link
                  href={`/properties/${roomId}/tenants/${tenant.id}/check-in`}
                  className="rounded px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50">
                  Check-in
                </Link>
                <Link
                  href={`/properties/${roomId}/tenants/${tenant.id}/service-requests`}
                  className="rounded px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50">
                  Service Requests
                </Link>
                <Link
                  href={`/properties/${roomId}/tenants/${tenant.id}/payments`}
                  className="rounded px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50">
                  Payments
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tenants?.length === 0 && <div className="text-center text-gray-500">No tenants found. Add your first tenant!</div>}
    </div>
  );
}
