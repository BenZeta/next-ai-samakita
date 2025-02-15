"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { PaymentStatus, PaymentType } from "@prisma/client";
import { toast } from "react-toastify";
import { CreditCard, Ban, Upload } from "lucide-react";

interface PaymentListProps {
  tenantId: string;
  paymentType: PaymentType;
}

export function PaymentList({ tenantId, paymentType }: PaymentListProps) {
  const [uploadingPaymentId, setUploadingPaymentId] = useState<string | null>(null);

  const {
    data: payments,
    isLoading,
    refetch,
  } = api.billing.getPayments.useQuery({
    tenantId,
    type: paymentType,
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

  const handleCancelPayment = async (paymentId: string) => {
    try {
      await updatePaymentMutation.mutateAsync({
        paymentId,
        status: PaymentStatus.CANCELLED,
      });
    } catch (error) {
      console.error("Failed to cancel payment:", error);
    }
  };

  const handleUploadProof = async (paymentId: string, file: File) => {
    try {
      setUploadingPaymentId(paymentId);
      const formData = new FormData();
      formData.append("file", file);

      // Upload to your storage service (e.g., Supabase)
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { url } = await response.json();

      // Update payment with proof and mark as PAID
      await updatePaymentMutation.mutateAsync({
        paymentId,
        status: PaymentStatus.PAID,
        proofOfPayment: url,
      });

      toast.success("Payment proof uploaded successfully!");
    } catch (error) {
      console.error("Failed to upload payment proof:", error);
      toast.error("Failed to upload payment proof");
    } finally {
      setUploadingPaymentId(null);
    }
  };

  if (isLoading) {
    return <div className="py-4 text-center text-gray-500">Loading payments...</div>;
  }

  if (!payments || payments.length === 0) {
    return <div className="py-4 text-center text-gray-500">No payments found.</div>;
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
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
            <div className="flex items-center space-x-3">
              <div
                className={`rounded-full p-2 ${
                  payment.status === PaymentStatus.OVERDUE
                    ? "bg-red-100 text-red-600"
                    : payment.status === PaymentStatus.PENDING
                    ? "bg-yellow-100 text-yellow-600"
                    : payment.status === PaymentStatus.PAID
                    ? "bg-green-100 text-green-600"
                    : payment.status === PaymentStatus.CANCELLED
                    ? "bg-gray-100 text-gray-600"
                    : "bg-gray-100 text-gray-600"
                }`}>
                {payment.status === PaymentStatus.CANCELLED ? (
                  <Ban className="h-5 w-5" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  Rp {payment.amount.toLocaleString()} - {payment.type}
                </p>
                <p className="text-sm text-gray-600">
                  Due: {new Date(payment.dueDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Status: {payment.status.charAt(0) + payment.status.slice(1).toLowerCase()}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              {payment.status !== PaymentStatus.CANCELLED && payment.status !== PaymentStatus.PAID && (
                <>
                  <label
                    htmlFor={`proof-${payment.id}`}
                    className={`cursor-pointer rounded-full bg-blue-100 p-2 text-blue-600 hover:bg-blue-200 ${
                      uploadingPaymentId === payment.id ? "opacity-50" : ""
                    }`}>
                    <Upload className="h-5 w-5" />
                    <input
                      type="file"
                      id={`proof-${payment.id}`}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadProof(payment.id, file);
                        }
                      }}
                      disabled={uploadingPaymentId === payment.id}
                    />
                  </label>
                  <button
                    onClick={() => handleCancelPayment(payment.id)}
                    className="rounded-full bg-red-100 p-2 text-red-600 hover:bg-red-200"
                    title="Cancel payment">
                    <Ban className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
          {payment.proofOfPayment && (
            <div className="mt-2">
              <a
                href={payment.proofOfPayment}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline">
                View Payment Proof
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
