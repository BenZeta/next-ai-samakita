"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { api } from "@/lib/trpc/react";

const tenantFormSchema = z.object({
  userId: z.string(),
  propertyId: z.string(),
  amount: z.number().min(1, "Amount is required"),
  roomId: z.string(),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

interface TenantFormProps {
  onSuccess?: () => void;
  initialData?: Partial<TenantFormData>;
  roomId: string;
}

export function TenantForm({ onSuccess, initialData, roomId }: TenantFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMutation = api.tenant.create.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      ...initialData,
      roomId,
    },
  });

  const onSubmit = async (data: TenantFormData) => {
    try {
      setIsSubmitting(true);
      await createMutation.mutateAsync(data);
      toast.success("Tenant created successfully!");
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save tenant:", error);
      toast.error("Failed to create tenant. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4">
      <div>
        <label
          htmlFor="userId"
          className="block text-sm font-medium text-gray-700">
          User ID
        </label>
        <input
          type="text"
          id="userId"
          {...register("userId")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.userId && <p className="mt-1 text-sm text-red-600">{errors.userId.message}</p>}
      </div>

      <div>
        <label
          htmlFor="propertyId"
          className="block text-sm font-medium text-gray-700">
          Property ID
        </label>
        <input
          type="text"
          id="propertyId"
          {...register("propertyId")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.propertyId && <p className="mt-1 text-sm text-red-600">{errors.propertyId.message}</p>}
      </div>

      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700">
          Amount
        </label>
        <input
          type="number"
          id="amount"
          {...register("amount", { valueAsNumber: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
      </div>

      <input
        type="hidden"
        {...register("roomId")}
      />

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
          {isSubmitting ? "Creating..." : "Create Tenant"}
        </button>
      </div>
    </form>
  );
}
