"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { PaymentStatus, PaymentType, PaymentMethod } from "@prisma/client";
import { toast } from "react-toastify";

interface PaymentListProps {
  tenantId: string;
  paymentType: PaymentType;
}

export function PaymentList({ tenantId, paymentType }: PaymentListProps) {
  const [uploadingPaymentId, setUploadingPaymentId] = useState<string | null>(null);
  const utils = api.useUtils();

  const { data: payments, isLoading } = api.billing.getPayments.useQuery({
    tenantId,
    type: paymentType,
  });

  const updatePaymentMutation = api.billing.updatePayment.useMutation({
    onSuccess: () => {
      toast.success("Payment status updated successfully!");
      utils.billing.getPayments.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    const checkPendingPayments = () => {
      if (!payments?.length) return;
      
      payments.forEach((payment) => {
        if (
          payment.method === PaymentMethod.STRIPE &&
          payment.status === PaymentStatus.PENDING &&
          payment.stripePaymentId
        ) {
          utils.billing.checkPaymentStatus.fetch({ paymentId: payment.id });
        }
      });
    };

    // Check immediately
    checkPendingPayments();

    // Then check every 10 seconds for pending Stripe payments
    const interval = setInterval(checkPendingPayments, 10000);

    return () => clearInterval(interval);
  }, [payments, utils.billing.checkPaymentStatus]);

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
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Method</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {payments?.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">{payment.type}</td>
                <td className="whitespace-nowrap px-6 py-4">Rp {payment.amount.toLocaleString()}</td>
                <td className="whitespace-nowrap px-6 py-4">{new Date(payment.dueDate).toLocaleDateString()}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
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
                <td className="whitespace-nowrap px-6 py-4">{payment.method}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    {payment.status !== PaymentStatus.PAID && (
                      <button
                        onClick={() => handleStatusChange(payment.id, PaymentStatus.PAID)}
                        className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700">
                        Mark as Paid
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(!payments || payments.length === 0) && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500">
          No payments found
        </div>
      )}
    </div>
  );
}