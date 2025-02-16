"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { PaymentStatus, PaymentType, PaymentMethod } from "@prisma/client";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, AlertTriangle } from "lucide-react";

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

    checkPendingPayments();
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
    return (
      <div className="flex justify-center py-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-6 w-6 rounded-full border-3 border-gray-300 border-t-indigo-600"
        />
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-gray-500"
      >
        No payments found
      </motion.div>
    );
  }

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return <Check className="h-4 w-4" />;
      case PaymentStatus.PENDING:
        return <Clock className="h-4 w-4" />;
      case PaymentStatus.OVERDUE:
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <AnimatePresence>
        {payments.map((payment, index) => (
          <motion.div
            key={payment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: index * 0.1 }}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-gray-300"
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    payment.status === PaymentStatus.PAID
                      ? "bg-green-100 text-green-700"
                      : payment.status === PaymentStatus.PENDING
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {getStatusIcon(payment.status)}
                    {payment.status}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    Rp {payment.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    Due {new Date(payment.dueDate).toLocaleDateString()}
                  </span>
                  {payment.status !== PaymentStatus.PAID && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStatusChange(payment.id, PaymentStatus.PAID)}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                    >
                      Mark as Paid
                    </motion.button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <span className="rounded-md bg-gray-100 px-2 py-1">
                  {payment.method}
                </span>
                <span>•</span>
                <span>{payment.type}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}