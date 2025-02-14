"use client";

import { api } from "@/lib/trpc/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FileText, Home, Phone, Mail, CreditCard, ClipboardList } from "lucide-react";

export default function TenantDetailsPage() {
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tenant.name}</h1>
          <p className="mt-2 text-gray-600">KTP: {tenant.ktpNumber}</p>
        </div>
        <div className="flex space-x-4">
          <Link
            href={`/tenants/${tenant.id}/check-in`}
            className="flex items-center rounded-md bg-white px-4 py-2 text-gray-700 shadow hover:bg-gray-50">
            <ClipboardList className="mr-2 h-5 w-5" />
            Check-in Items
          </Link>
          <Link
            href={`/tenants/${tenant.id}/payments`}
            className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            <CreditCard className="mr-2 h-5 w-5" />
            Payments
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Personal Information</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <Mail className="mr-3 h-5 w-5 text-gray-400" />
              <span>{tenant.email}</span>
            </div>
            <div className="flex items-center">
              <Phone className="mr-3 h-5 w-5 text-gray-400" />
              <span>{tenant.phone}</span>
            </div>
            <div className="flex items-center">
              <Home className="mr-3 h-5 w-5 text-gray-400" />
              <span>
                Room {tenant.room.number} at {tenant.room.property.name}
              </span>
            </div>
            <div className="flex items-center">
              <FileText className="mr-3 h-5 w-5 text-gray-400" />
              <div className="flex space-x-2">
                <a
                  href={tenant.ktpFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-900">
                  View KTP
                </a>
                {tenant.kkFile && (
                  <>
                    <span>|</span>
                    <a
                      href={tenant.kkFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900">
                      View KK
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <h3 className="mt-6 mb-2 text-lg font-medium">References</h3>
          <div className="flex flex-wrap gap-2">
            {tenant.references.map((reference, index) => (
              <span
                key={index}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                {reference}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Tenancy Details</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Period</h3>
              <p className="mt-1">
                {new Date(tenant.startDate).toLocaleDateString()} - {new Date(tenant.endDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <span
                className={`mt-1 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                  tenant.status === "active" ? "bg-green-100 text-green-800" : tenant.status === "inactive" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                }`}>
                {tenant.status}
              </span>
            </div>
          </div>

          <h3 className="mt-6 mb-4 text-lg font-medium">Check-in Items</h3>
          {tenant.checkInItems.length > 0 ? (
            <div className="space-y-3">
              {tenant.checkInItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.itemName}</span>
                    <span className="text-sm text-gray-500">{item.condition}</span>
                  </div>
                  {item.notes && <p className="mt-1 text-sm text-gray-600">{item.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No check-in items recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
