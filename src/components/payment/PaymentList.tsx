"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { PaymentStatus, PaymentType } from "@prisma/client";
import { toast } from "react-toastify";
import { CreditCard, Filter } from "lucide-react";

interface PaymentListProps {
  tenantId?: string;
}

export function PaymentList({ tenantId }: PaymentListProps) {
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [type, setType] = useState<PaymentType | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const {
    data: payments,
    isLoading,
    refetch,
  } = api.billing.getPayments.useQuery({
    tenantId,
    status: status === "all" ? undefined : status,
    type: type === "all" ? undefined : type,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  const updatePaymentMutation = api.billing.updatePayment.useMutation({
    onSuccess: () => {
      toast.success("Payment status updated successfully!");
      refetch();
    },
    onError: (error) => {
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus | "all")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="all">All Status</option>
            {Object.values(PaymentStatus).map((s) => (
              <option
                key={s}
                value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PaymentType | "all")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="all">All Types</option>
            {Object.values(PaymentType).map((t) => (
              <option
                key={t}
                value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
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

      <div className="overflow-x-auto rounded-lg border border-gray-200">
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
            {payments?.map((payment) => (
              <tr
                key={payment.id}
                className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5 text-gray-400" />
                    <span className="capitalize">{payment.type.toLowerCase()}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="font-medium">Rp {payment.amount.toLocaleString()}</span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">{new Date(payment.dueDate).toLocaleDateString()}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      payment.status === PaymentStatus.PAID
                        ? "bg-green-100 text-green-800"
                        : payment.status === PaymentStatus.PENDING
                        ? "bg-yellow-100 text-yellow-800"
                        : payment.status === PaymentStatus.OVERDUE
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
                    {Object.values(PaymentStatus).map((status) => (
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
