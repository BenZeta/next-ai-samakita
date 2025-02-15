'use client';

import { api } from '@/lib/trpc/react';
import { TenantStatus } from '@prisma/client';
import { format } from 'date-fns';
import {
  Calendar,
  ClipboardList,
  CreditCard,
  FileSignature,
  FileText,
  Home,
  Mail,
  Phone,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function TenantDetailsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: tenant, isLoading } = api.tenant.get.useQuery({ id: tenantId });
  const utils = api.useContext();

  const generateContractMutation = api.tenant.generateContract.useMutation({
    onSuccess: () => {
      toast.success('Contract generated successfully!');
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const extendLeaseMutation = api.tenant.extendLease.useMutation({
    onSuccess: () => {
      toast.success('Lease extended successfully');
      utils.tenant.get.invalidate({ id: tenantId });
      setShowConfirmation(false);
    },
    onError: error => {
      toast.error(error.message);
      setShowConfirmation(false);
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!tenant) {
    return <div>Tenant not found</div>;
  }

  const handleGenerateContract = async () => {
    try {
      await generateContractMutation.mutateAsync({ tenantId });
    } catch (error) {
      console.error('Failed to generate contract:', error);
    }
  };

  const handleExtendLease = async () => {
    try {
      await extendLeaseMutation.mutateAsync({ tenantId });
    } catch (error) {
      console.error('Failed to extend lease:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tenant.name}</h1>
          <p className="mt-2 text-gray-600">{tenant.ktpNumber && `KTP: ${tenant.ktpNumber}`}</p>
        </div>
        <div className="flex space-x-4">
          <Link
            href={`/tenants/${tenant.id}/check-in`}
            className="flex items-center rounded-md bg-white px-4 py-2 text-gray-700 shadow hover:bg-gray-50"
          >
            <ClipboardList className="mr-2 h-5 w-5" />
            Check-in Items
          </Link>
          <Link
            href={`/tenants/${tenant.id}/payments`}
            className="flex items-center rounded-md bg-white px-4 py-2 text-gray-700 shadow hover:bg-gray-50"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Payments
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowConfirmation(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Calendar className="h-4 w-4" />
            Extend Lease
          </button>
          <button
            onClick={handleGenerateContract}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            <FileSignature className="h-4 w-4" />
            Generate Contract
          </button>
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
                {tenant.ktpFile && (
                  <a
                    href={tenant.ktpFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    View KTP
                  </a>
                )}
                {tenant.kkFile && (
                  <a
                    href={tenant.kkFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    View KK
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="font-medium">Lease Period:</span>
              <span>
                {tenant.startDate ? format(new Date(tenant.startDate), 'MMM d, yyyy') : 'Not set'} -{' '}
                {tenant.endDate ? format(new Date(tenant.endDate), 'MMM d, yyyy') : 'Not set'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <span className="font-medium">Rent Amount:</span>
              <span>Rp {tenant.rentAmount?.toLocaleString() ?? 'Not set'}</span>
            </div>
          </div>

          <h3 className="mt-6 mb-2 text-lg font-medium">References</h3>
          <div className="flex flex-wrap gap-2">
            {tenant.references.map((reference, index) => (
              <span
                key={index}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
              >
                {reference}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6">
            <h2 className="mb-4 text-xl font-semibold">Contract Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <span
                  className={`rounded-full px-3 py-1 text-sm ${
                    tenant.contractFile ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {tenant.contractFile ? 'Contract Generated' : 'No Contract'}
                </span>
              </div>

              {tenant.contractFile && (
                <div className="flex flex-col space-y-2">
                  <a
                    href={tenant.contractFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-indigo-600 hover:text-indigo-900"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Contract
                  </a>
                  <Link
                    href={`/contracts/upload?tenantId=${tenant.id}`}
                    className="flex items-center rounded-md bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Signed Contract
                  </Link>
                </div>
              )}

              {!tenant.contractFile && (
                <button
                  onClick={handleGenerateContract}
                  disabled={generateContractMutation.isLoading}
                  className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generateContractMutation.isLoading ? 'Generating...' : 'Generate Contract'}
                </button>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="mb-4 text-xl font-semibold">Tenancy Details</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Period</h3>
                <p className="mt-1">
                  {tenant.startDate ? new Date(tenant.startDate).toLocaleDateString() : 'Not set'} -{' '}
                  {tenant.endDate ? new Date(tenant.endDate).toLocaleDateString() : 'Not set'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Monthly Rent</h3>
                <p className="mt-1">Rp {tenant.rentAmount?.toLocaleString() ?? 'Not set'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Deposit</h3>
                <p className="mt-1">Rp {tenant.depositAmount?.toLocaleString() ?? 'Not set'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    tenant.status === TenantStatus.ACTIVE
                      ? 'bg-green-100 text-green-800'
                      : tenant.status === TenantStatus.INACTIVE
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {tenant.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Check-in Items</h2>
          {tenant.checkInItems.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tenant.checkInItems.map(item => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.itemName}</span>
                    <span className="text-sm text-gray-500">{item.condition}</span>
                  </div>
                  {item.notes && <p className="mt-2 text-sm text-gray-600">{item.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No check-in items recorded yet.</p>
          )}
        </div>
      </div>

      {/* Contract Details */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900">Contract Details</h3>
        <dl className="mt-2 divide-y divide-gray-200">
          <div className="flex justify-between py-3">
            <dt className="text-sm font-medium text-gray-500">Contract Status</dt>
            <dd className="text-sm text-gray-900">
              {tenant.contractFile ? 'Generated' : 'Not Generated'}
            </dd>
          </div>
          {tenant.contractFile && (
            <div className="flex justify-between py-3">
              <dt className="text-sm font-medium text-gray-500">Contract File</dt>
              <dd className="text-sm text-gray-900">
                <a
                  href={tenant.contractFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  View Contract
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Confirm Lease Extension</h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to extend {tenant.name}'s lease by one month? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendLease}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Confirm Extension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
