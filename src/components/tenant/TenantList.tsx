"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { TenantStatus } from "@prisma/client";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";

interface TenantListProps {
  roomId?: string;
  showAddButton?: boolean;
}

export function TenantList({ roomId, showAddButton = true }: TenantListProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TenantStatus | "all">("all");

  const { data: tenants, isLoading } = api.tenant.list.useQuery({
    roomId,
    status: status === "all" ? undefined : status,
    search: search || undefined,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TenantStatus | "all")}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="all">All Status</option>
            {Object.values(TenantStatus).map((s) => (
              <option
                key={s}
                value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {showAddButton && roomId && (
          <Link
            href={`/rooms/${roomId}/tenants/new`}
            className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            <UserPlus className="mr-2 h-5 w-5" />
            Add Tenant
          </Link>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenants?.map((tenant) => (
              <tr
                key={tenant.id}
                className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                  <div className="text-sm text-gray-500">{tenant.ktpNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Room {tenant.room.number}</div>
                  <div className="text-sm text-gray-500">{tenant.room.property.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{tenant.email}</div>
                  <div className="text-sm text-gray-500">{tenant.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {tenant.startDate ? new Date(tenant.startDate).toLocaleDateString() : "Not set"} - {tenant.endDate ? new Date(tenant.endDate).toLocaleDateString() : "Not set"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      tenant.status === "active" ? "bg-green-100 text-green-800" : tenant.status === "inactive" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                    {tenant.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Link
                    href={`/tenants/${tenant.id}`}
                    className="text-indigo-600 hover:text-indigo-900">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
