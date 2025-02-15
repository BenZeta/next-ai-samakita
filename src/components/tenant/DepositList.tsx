"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { PaymentStatus, PaymentType } from "@prisma/client";
import { toast } from "react-toastify";

interface DepositListProps {
  tenantId: string;
}

export function DepositList({ tenantId }: DepositListProps) {
  const { data: deposits, refetch } = api.billing.getPayments.useQuery({
    tenantId,
    type: PaymentType.DEPOSIT,
  });

  const updateDepositMutation = api.billing.updateDeposit.useMutation({
    onSuccess: () => {
      toast.success("Deposit status updated successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleStatusChange = async (depositId: string, isRefunded: boolean) => {
    try {
      await updateDepositMutation.mutateAsync({
        paymentId: depositId,
        isRefunded,
      });
    } catch (error) {
      console.error("Failed to update deposit status:", error);
    }
  };

  return (
    <div className="space-y-4">
      {deposits?.map((deposit) => (
        <div
          key={deposit.id}
          className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                Rp {deposit.amount.toLocaleString()} - Security Deposit
              </p>
              <p className="text-sm text-gray-600">
                Status: {deposit.isRefunded ? "Refunded" : "Paid"}
              </p>
              <p className="text-sm text-gray-600">
                Date: {new Date(deposit.createdAt).toLocaleDateString()}
              </p>
            </div>
            {!deposit.isRefunded && (
              <button
                onClick={() => handleStatusChange(deposit.id, true)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Mark as Refunded
              </button>
            )}
          </div>
        </div>
      ))}

      {(!deposits || deposits.length === 0) && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500">
          No deposits found
        </div>
      )}
    </div>
  );
} 