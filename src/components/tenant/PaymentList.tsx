"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { PaymentStatus, PaymentType } from "@prisma/client";
import { toast } from "react-toastify";
import { TRPCClientErrorLike } from "@trpc/client";
import { AppRouter } from "@/lib/api/root";

interface PaymentListProps {
  tenantId: string;
}

interface Payment {
  id: string;
  amount: number;
  dueDate: Date;
  paidAt: Date | null;
  status: PaymentStatus;
  type: PaymentType;
  description?: string | null;
  notes?: string | null;
}

export function PaymentList({ tenantId }: PaymentListProps) {
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | undefined>();
  const [selectedType, setSelectedType] = useState<PaymentType | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: payments, refetch } = api.billing.getPayments.useQuery({
    tenantId,
    status: selectedStatus,
    type: selectedType,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  const updatePaymentMutation = api.billing.updatePayment.useMutation({
    onSuccess: () => {
      toast.success("Payment status updated successfully!");
      refetch();
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error(error.message);
    },
  });

  const handleStatusChange = async (paymentId: string, newStatus: PaymentStatus) => {
    try {
      await updatePaymentMutation.mutateAsync({
        paymentId,
        status: newStatus,
        paidAt: newStatus === PaymentStatus.PAID ? new Date() : undefined,
      });
    } catch (error) {
      console.error("Failed to update payment status:", error);
    }
  };

  const statusOptions = Object.values(PaymentStatus);
  const typeOptions = Object.values(PaymentType);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={selectedStatus || ""}
            onChange={(e) => setSelectedStatus(e.target.value ? (e.target.value as PaymentStatus) : undefined)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
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

        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={selectedType || ""}
            onChange={(e) => setSelectedType(e.target.value ? (e.target.value as PaymentType) : undefined)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="">All Types</option>
            {typeOptions.map((type) => (
              <option
                key={type}
                value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Paid At</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {payments?.map((payment: Payment) => (
              <tr key={payment.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="capitalize">{payment.type.toLowerCase()}</span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">Rp {payment.amount.toLocaleString()}</td>
                <td className="whitespace-nowrap px-6 py-4">{new Date(payment.dueDate).toLocaleDateString()}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      payment.status === "PAID"
                        ? "bg-green-100 text-green-800"
                        : payment.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : payment.status === "OVERDUE"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                    {payment.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "-"}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <select
                    value={payment.status}
                    onChange={(e) => handleStatusChange(payment.id, e.target.value as PaymentStatus)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                    {statusOptions.map((status) => (
                      <option
                        key={status}
                        value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!payments || payments.length === 0) && <div className="py-8 text-center text-gray-500">No payments found for the selected filters.</div>}
      </div>
    </div>
  );
}
