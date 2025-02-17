"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { api } from "@/lib/trpc/react";

const tenantFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  ktpNumber: z.string().optional(),
  depositAmount: z.number().min(1, "Deposit amount is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  references: z.array(z.string()).optional(),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

interface TenantFormProps {
  onSuccess?: () => void;
  roomId: string;
}

export function TenantForm({ onSuccess, roomId }: TenantFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [kkFile, setKkFile] = useState<File | null>(null);
  const createMutation = api.tenant.create.useMutation();
  
  // Fetch room details to get the price
  const { data: room } = api.room.get.useQuery({ id: roomId });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      references: [],
    },
  });

  const onSubmit = async (data: TenantFormData) => {
    try {
      setIsSubmitting(true);

      if (!room) {
        toast.error("Room details not found");
        return;
      }

      // Create tenant with room price
      await createMutation.mutateAsync({
        ...data,
        roomId,
        rentAmount: room.price,
      });

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            id="name"
            {...register("name")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            {...register("email")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            {...register("phone")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
        </div>

        <div>
          <label htmlFor="ktpNumber" className="block text-sm font-medium text-gray-700">
            KTP Number (Optional)
          </label>
          <input
            type="text"
            id="ktpNumber"
            {...register("ktpNumber")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.ktpNumber && <p className="mt-1 text-sm text-red-600">{errors.ktpNumber.message}</p>}
        </div>

        {room && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rent Amount (from room price)
            </label>
            <p className="mt-1 text-lg font-medium text-gray-900">
              Rp {room.price.toLocaleString()}
            </p>
          </div>
        )}

        <div>
          <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700">
            Deposit Amount
          </label>
          <input
            type="number"
            id="depositAmount"
            {...register("depositAmount", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.depositAmount && <p className="mt-1 text-sm text-red-600">{errors.depositAmount.message}</p>}
        </div>

        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            {...register("startDate")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            {...register("endDate")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting || !room}
          className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
          {isSubmitting ? "Creating..." : "Create Tenant"}
        </button>
      </div>
    </form>
  );
}
