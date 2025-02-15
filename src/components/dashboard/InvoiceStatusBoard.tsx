"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { PaymentStatus, PaymentType, Payment, Tenant, Room, Property, TenantStatus, RoomStatus } from "@prisma/client";
import { toast } from "react-toastify";
import { CreditCard, Filter, Check, Ban, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

type PaymentWithTenant = Payment & {
  tenant: Tenant & {
    room: Room;
  };
  property: Property;
};

interface InvoiceStatusBoardProps {
  payments?: PaymentWithTenant[];
  isLoading?: boolean;
}

export function InvoiceStatusBoard({ payments: initialPayments, isLoading }: InvoiceStatusBoardProps) {
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [type, setType] = useState<PaymentType | "all">("all");

  const {
    data: paymentsData,
    refetch,
  } = api.billing.getPayments.useQuery({
    tenantId: "all",
    type: type === "all" ? undefined : type,
  });

  const updatePaymentMutation = api.billing.updatePayment.useMutation({
    onSuccess: () => {
      toast.success("Payment status updated successfully!");
      refetch();
      setSelectedPayments([]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleBulkStatusUpdate = async (newStatus: PaymentStatus) => {
    try {
      await Promise.all(
        selectedPayments.map((paymentId) =>
          updatePaymentMutation.mutateAsync({
            paymentId,
            status: newStatus,
          })
        )
      );
    } catch (error) {
      console.error("Failed to update payment statuses:", error);
    }
  };

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments((prev) => (prev.includes(paymentId) ? prev.filter((id) => id !== paymentId) : [...prev, paymentId]));
  };

  const handleStatusChange = async (paymentId: string, newStatus: PaymentStatus) => {
    try {
      await updatePaymentMutation.mutateAsync({
        paymentId,
        status: newStatus,
      });
    } catch (error) {
      console.error("Failed to update payment status:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[400px] rounded-lg bg-white p-6 shadow">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const payments = paymentsData || initialPayments || [];

  const statusCounts = {
    pending: payments.filter((p) => p.status === PaymentStatus.PENDING).length,
    paid: payments.filter((p) => p.status === PaymentStatus.PAID).length,
    overdue: payments.filter((p) => p.status === PaymentStatus.OVERDUE).length,
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-medium text-gray-900">Invoice Status</h2>
        </div>
        <div className="flex space-x-4">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PaymentType | "all")}
            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="all">All Types</option>
            {Object.values(PaymentType).map((t) => (
              <option
                key={t}
                value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-800">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-yellow-900">{statusCounts.pending}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">Paid</p>
          <p className="mt-1 text-2xl font-semibold text-green-900">{statusCounts.paid}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Overdue</p>
          <p className="mt-1 text-2xl font-semibold text-red-900">{statusCounts.overdue}</p>
        </div>
      </div>

      {selectedPayments.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-700">
            <span className="font-medium">{selectedPayments.length}</span> payments selected
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => handleBulkStatusUpdate(PaymentStatus.PAID)}
              className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700">
              Mark as Paid
            </button>
            <button
              onClick={() => handleBulkStatusUpdate(PaymentStatus.OVERDUE)}
              className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
              Mark as Overdue
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedPayments.length === payments.length}
                  onChange={(e) => setSelectedPayments(e.target.checked ? payments.map((p) => p.id) : [])}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tenant</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="hover:bg-gray-50">
                <td className="w-8 px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedPayments.includes(payment.id)}
                    onChange={() => togglePaymentSelection(payment.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{payment.tenant.name}</p>
                    <p className="text-sm text-gray-500">Room {payment.tenant.room.number}</p>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="capitalize">{payment.type.toLowerCase()}</span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="font-medium">Rp {payment.amount.toLocaleString()}</span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">{format(new Date(payment.dueDate), "dd MMM yyyy")}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                      payment.status === PaymentStatus.OVERDUE
                        ? "bg-red-100 text-red-800"
                        : payment.status === PaymentStatus.PENDING
                        ? "bg-yellow-100 text-yellow-800"
                        : payment.status === PaymentStatus.PAID
                        ? "bg-green-100 text-green-800"
                        : payment.status === PaymentStatus.CANCELLED
                        ? "bg-gray-100 text-gray-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1).toLowerCase()}
                  </span>
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
