"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";

const checkInItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  condition: z.string().min(1, "Condition is required"),
  notes: z.string().optional(),
});

type CheckInItemFormData = z.infer<typeof checkInItemSchema>;

export default function TenantCheckInPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const [isLoading, setIsLoading] = useState(false);

  const { data: tenant, isLoading: isLoadingTenant } = api.tenant.get.useQuery({ id: tenantId });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CheckInItemFormData>({
    resolver: zodResolver(checkInItemSchema),
  });

  const addItemMutation = api.tenant.addCheckInItem.useMutation({
    onSuccess: () => {
      toast.success("Item added successfully!");
      reset();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: CheckInItemFormData) => {
    setIsLoading(true);
    try {
      await addItemMutation.mutateAsync({
        tenantId,
        ...data,
      });
    } catch (error) {
      console.error("Failed to add check-in item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingTenant) {
    return <div>Loading...</div>;
  }

  if (!tenant) {
    return <div>Tenant not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Check-in Items</h1>
        <p className="mt-2 text-gray-600">
          Tenant: {tenant.name} - Room {tenant.room.number}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Add New Item</h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4">
            <div>
              <label
                htmlFor="itemName"
                className="block text-sm font-medium text-gray-700">
                Item Name
              </label>
              <input
                type="text"
                id="itemName"
                {...register("itemName")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.itemName && <p className="mt-1 text-sm text-red-600">{errors.itemName.message}</p>}
            </div>

            <div>
              <label
                htmlFor="condition"
                className="block text-sm font-medium text-gray-700">
                Condition
              </label>
              <select
                id="condition"
                {...register("condition")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="">Select condition</option>
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
              {errors.condition && <p className="mt-1 text-sm text-red-600">{errors.condition.message}</p>}
            </div>

            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                {...register("notes")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
                {isLoading ? "Adding..." : "Add Item"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Current Items</h2>
          {tenant.checkInItems.length > 0 ? (
            <div className="space-y-3">
              {tenant.checkInItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.itemName}</span>
                    <span className="text-sm text-gray-500">{item.condition}</span>
                  </div>
                  {item.notes && <p className="mt-1 text-sm text-gray-600">{item.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No check-in items recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
