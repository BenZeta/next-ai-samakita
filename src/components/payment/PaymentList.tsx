"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { PaymentStatus, PaymentType, PaymentMethod } from "@prisma/client";
import { toast } from "react-toastify";
import { TRPCClientErrorLike } from "@trpc/client";
import { AppRouter } from "@/lib/api/root";

interface PaymentListProps {
  tenantId: string;
  paymentType: PaymentType;
}

export function PaymentList({ tenantId, paymentType }: PaymentListProps) {
  const [selectedType, setSelectedType] = useState<PaymentType | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const utils = api.useUtils();

  const { data: payments, refetch } = api.billing.getPayments.useQuery({
    tenantId,
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

  const checkPaymentStatus = api.billing.checkStatus.useMutation({
    onSuccess: () => {
      utils.billing.getPayments.invalidate();
    },
  });

  useEffect(() => {
    const checkPendingPayments = () => {
      if (!payments?.length) return;
      
      payments.forEach((payment) => {
        if (
          payment.method === PaymentMethod.MIDTRANS &&
          payment.status === PaymentStatus.PENDING &&
          payment.midtransId
        ) {
          checkPaymentStatus.mutate({ paymentId: payment.id });
        }
      });
    };

    // Check immediately
    checkPendingPayments();

    // Then check every 10 seconds for pending Midtrans payments
    const interval = setInterval(checkPendingPayments, 10000);

    return () => clearInterval(interval);
  }, [payments, checkPaymentStatus]);

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

  const typeOptions = Object.values(PaymentType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={selectedType || ""}
            onChange={(e) => setSelectedType(e.target.value ? (e.target.value as PaymentType) : undefined)}
            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="">All Types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      {payments?.map((payment) => (
        <div
          key={payment.id}
          className={`rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md ${
            payment.status === PaymentStatus.OVERDUE
              ? "border-red-200 bg-red-50"
              : payment.status === PaymentStatus.PENDING
              ? "border-yellow-200 bg-yellow-50"
              : payment.status === PaymentStatus.PAID
              ? "border-green-200 bg-green-50"
              : payment.status === PaymentStatus.CANCELLED
              ? "border-gray-200 bg-gray-50"
              : ""
          }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                Rp {payment.amount.toLocaleString()} - {payment.type}
              </p>
              <p className="text-sm text-gray-600">Due: {new Date(payment.dueDate).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600">
                Status: {payment.status.charAt(0) + payment.status.slice(1).toLowerCase()}
              </p>
              {payment.method && (
                <p className="text-sm text-gray-600">
                  Method: {payment.method.charAt(0) + payment.method.slice(1).toLowerCase()}
                </p>
              )}
              {payment.midtransStatus && (
                <p className="text-sm text-gray-600">
                  Midtrans Status: {payment.midtransStatus}
                </p>
              )}
            </div>
            {payment.proofOfPayment && (
              <a
                href={payment.proofOfPayment}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline">
                View Payment Proof
              </a>
            )}
          </div>
        </div>
      ))}

      {(!payments || payments.length === 0) && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500">
          No payments found
        </div>
      )}
    </div>
  );
}
