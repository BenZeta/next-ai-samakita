"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { api } from "@/lib/trpc/react";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const tenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^(\+62|62|0)8[1-9][0-9]{6,9}$/, "Invalid Indonesian phone number"),
  ktpNumber: z.string().min(16, "Invalid KTP number").max(16, "Invalid KTP number"),
  ktpFile: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "KTP file is required")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, "Max file size is 5MB")
    .refine((files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type), "Only .jpg, .png, and .pdf files are accepted"),
  kkFile: z
    .custom<FileList>()
    .refine((files) => files?.length === 0 || files?.length === 1, "Only one file allowed")
    .refine((files) => !files?.[0] || files?.[0]?.size <= MAX_FILE_SIZE, "Max file size is 5MB")
    .refine((files) => !files?.[0] || ACCEPTED_FILE_TYPES.includes(files?.[0]?.type), "Only .jpg, .png, and .pdf files are accepted")
    .optional(),
  references: z.array(z.string()).min(1, "At least one reference is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface TenantFormProps {
  roomId: string;
  initialData?: Omit<TenantFormData, "ktpFile" | "kkFile"> & { id: string };
}

export function TenantForm({ roomId, initialData }: TenantFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [references, setReferences] = useState<string[]>(initialData?.references || []);
  const [newReference, setNewReference] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      ...initialData,
      startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : undefined,
      endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split("T")[0] : undefined,
    },
  });

  const createMutation = api.tenant.create.useMutation({
    onSuccess: () => {
      toast.success("Tenant added successfully!");
      router.push(`/properties/${roomId}/tenants`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = api.tenant.update.useMutation({
    onSuccess: () => {
      toast.success("Tenant updated successfully!");
      router.push(`/properties/${roomId}/tenants`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: TenantFormData) => {
    setIsLoading(true);
    try {
      // Upload KTP file
      const ktpFormData = new FormData();
      ktpFormData.append("file", data.ktpFile[0]);
      const ktpResponse = await fetch("/api/upload/ktp", {
        method: "POST",
        body: ktpFormData,
      });
      if (!ktpResponse.ok) throw new Error("Failed to upload KTP file");
      const { url: ktpUrl } = await ktpResponse.json();

      // Upload KK file if provided
      let kkUrl: string | undefined;
      if (data.kkFile?.[0]) {
        const kkFormData = new FormData();
        kkFormData.append("file", data.kkFile[0]);
        const kkResponse = await fetch("/api/upload/kk", {
          method: "POST",
          body: kkFormData,
        });
        if (!kkResponse.ok) throw new Error("Failed to upload KK file");
        const { url } = await kkResponse.json();
        kkUrl = url;
      }

      const tenantData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        ktpNumber: data.ktpNumber,
        ktpFile: ktpUrl,
        kkFile: kkUrl,
        references,
        roomId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      };

      if (initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          data: tenantData,
        });
      } else {
        await createMutation.mutateAsync(tenantData);
      }
    } catch (error) {
      console.error("Failed to save tenant:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addReference = () => {
    if (newReference.trim()) {
      setReferences((prev) => [...prev, newReference.trim()]);
      setNewReference("");
    }
  };

  const removeReference = (index: number) => {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          type="text"
          id="name"
          {...register("name")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          {...register("email")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          {...register("phone")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
      </div>

      <div>
        <label
          htmlFor="ktpNumber"
          className="block text-sm font-medium text-gray-700">
          KTP Number
        </label>
        <input
          type="text"
          id="ktpNumber"
          {...register("ktpNumber")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.ktpNumber && <p className="mt-1 text-sm text-red-600">{errors.ktpNumber.message}</p>}
      </div>

      <div>
        <label
          htmlFor="ktpFile"
          className="block text-sm font-medium text-gray-700">
          KTP File
        </label>
        <input
          type="file"
          id="ktpFile"
          accept=".jpg,.jpeg,.png,.pdf"
          {...register("ktpFile")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <p className="mt-1 text-sm text-gray-500">Upload KTP file (max 5MB, .jpg, .png, or .pdf)</p>
        {errors.ktpFile && <p className="mt-1 text-sm text-red-600">{errors.ktpFile.message}</p>}
      </div>

      <div>
        <label
          htmlFor="kkFile"
          className="block text-sm font-medium text-gray-700">
          Family Card (KK) File
        </label>
        <input
          type="file"
          id="kkFile"
          accept=".jpg,.jpeg,.png,.pdf"
          {...register("kkFile")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <p className="mt-1 text-sm text-gray-500">Upload KK file (optional, max 5MB, .jpg, .png, or .pdf)</p>
        {errors.kkFile && <p className="mt-1 text-sm text-red-600">{errors.kkFile.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">References</label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newReference}
              onChange={(e) => setNewReference(e.target.value)}
              placeholder="Add reference contact"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={addReference}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
              Add
            </button>
          </div>
          <div className="space-y-2">
            {references.map((reference, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                <span>{reference}</span>
                <button
                  type="button"
                  onClick={() => removeReference(index)}
                  className="text-red-600 hover:text-red-800">
                  Remove
                </button>
              </div>
            ))}
          </div>
          {references.length === 0 && <p className="text-sm text-red-600">At least one reference is required</p>}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            {...register("startDate")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
        </div>

        <div>
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            {...register("endDate")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
        {isLoading ? (initialData ? "Updating..." : "Creating...") : initialData ? "Update Tenant" : "Add Tenant"}
      </button>
    </form>
  );
}
