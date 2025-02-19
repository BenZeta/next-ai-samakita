"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { api } from "@/lib/trpc/react";
import { useRouter } from "next/navigation";
import { PaymentType, PaymentMethod } from "@prisma/client";
import { useTranslations } from 'next-intl';

const paymentSchema = z.object({
  amount: z.number().min(0, "Amount must be greater than or equal to 0"),
  type: z.nativeEnum(PaymentType),
  method: z.nativeEnum(PaymentMethod),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  tenantId: string;
}

export function PaymentForm({ tenantId }: PaymentFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      method: PaymentMethod.MANUAL,
    },
  });

  const createPaymentMutation = api.billing.createPayment.useMutation({
    onSuccess: () => {
      toast.success(t('tenants.details.payments.form.success'));
      router.back();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsLoading(true);
    try {
      await createPaymentMutation.mutateAsync({
        tenantId,
        amount: data.amount,
        type: data.type,
        method: data.method,
        dueDate: new Date(data.dueDate),
        description: data.description,
        notes: data.notes,
      });
    } catch (error) {
      console.error("Failed to create payment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-muted-foreground">
          {t('tenants.details.payments.form.amount')}
        </label>
        <input
          type="number"
          id="amount"
          {...register("amount", { valueAsNumber: true })}
          className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {errors.amount && <p className="mt-1 text-sm text-destructive">{errors.amount.message}</p>}
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-muted-foreground">
          {t('billing.details.payments.title')}
        </label>
        <select
          id="type"
          {...register("type")}
          className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
          {Object.values(PaymentType).map((type) => (
            <option key={type} value={type}>
              {type.charAt(0) + type.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        {errors.type && <p className="mt-1 text-sm text-destructive">{errors.type.message}</p>}
      </div>

      <div>
        <label htmlFor="method" className="block text-sm font-medium text-muted-foreground">
          {t('billing.details.payments.method')}
        </label>
        <select
          id="method"
          {...register("method")}
          className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
          {Object.values(PaymentMethod).map((method) => (
            <option key={method} value={method}>
              {method.charAt(0) + method.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        {errors.method && <p className="mt-1 text-sm text-destructive">{errors.method.message}</p>}
      </div>

      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-muted-foreground">
          {t('billing.details.dueDate')}
        </label>
        <input
          type="date"
          id="dueDate"
          {...register("dueDate")}
          className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {errors.dueDate && <p className="mt-1 text-sm text-destructive">{errors.dueDate.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-muted-foreground">
          {t('billing.details.description')}
        </label>
        <textarea
          id="description"
          {...register("description")}
          rows={3}
          className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {errors.description && <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">
          {t('tenants.details.payments.form.notes')}
        </label>
        <textarea
          id="notes"
          {...register("notes")}
          rows={3}
          className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {errors.notes && <p className="mt-1 text-sm text-destructive">{errors.notes.message}</p>}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50">
          {isLoading ? t('tenants.details.payments.form.submitting') : t('tenants.details.payments.form.submit')}
        </button>
      </div>
    </form>
  );
}
