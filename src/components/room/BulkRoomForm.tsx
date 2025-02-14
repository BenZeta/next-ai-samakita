"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { api } from "@/lib/trpc/react";
import { useRouter } from "next/navigation";
import { RoomType } from "@prisma/client";

const roomSchema = z.object({
  startNumber: z.string().min(1, "Starting room number is required"),
  count: z.number().min(1, "Number of rooms must be at least 1").max(50, "Maximum 50 rooms at once"),
  type: z.nativeEnum(RoomType),
  size: z.number().min(1, "Size must be greater than 0"),
  amenities: z.array(z.string()).min(1, "At least one amenity is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  numberingPrefix: z.string().optional(),
  numberingSuffix: z.string().optional(),
  startingFloor: z.number().optional(),
});

type BulkRoomFormData = z.infer<typeof roomSchema>;

// List of common room amenities
const AMENITIES = ["Private Bathroom", "Air Conditioning", "Balcony", "TV", "Mini Fridge", "Desk", "Wardrobe", "Water Heater", "Window"];

interface BulkRoomFormProps {
  propertyId: string;
}

export function BulkRoomForm({ propertyId }: BulkRoomFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BulkRoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      count: 1,
      startingFloor: 1,
    },
  });

  const createMutation = api.room.createBulk.useMutation({
    onSuccess: () => {
      toast.success("Rooms created successfully!");
      router.push(`/properties/${propertyId}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: BulkRoomFormData) => {
    setIsLoading(true);
    try {
      await createMutation.mutateAsync({
        ...data,
        propertyId,
        amenities: selectedAmenities,
      });
    } catch (error) {
      console.error("Failed to create rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) => (prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]));
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="startNumber"
            className="block text-sm font-medium text-gray-700">
            Starting Room Number
          </label>
          <input
            type="text"
            id="startNumber"
            {...register("startNumber")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.startNumber && <p className="mt-1 text-sm text-red-600">{errors.startNumber.message}</p>}
        </div>

        <div>
          <label
            htmlFor="count"
            className="block text-sm font-medium text-gray-700">
            Number of Rooms
          </label>
          <input
            type="number"
            id="count"
            {...register("count", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.count && <p className="mt-1 text-sm text-red-600">{errors.count.message}</p>}
        </div>

        <div>
          <label
            htmlFor="numberingPrefix"
            className="block text-sm font-medium text-gray-700">
            Room Number Prefix (Optional)
          </label>
          <input
            type="text"
            id="numberingPrefix"
            {...register("numberingPrefix")}
            placeholder="e.g., 'A-'"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="numberingSuffix"
            className="block text-sm font-medium text-gray-700">
            Room Number Suffix (Optional)
          </label>
          <input
            type="text"
            id="numberingSuffix"
            {...register("numberingSuffix")}
            placeholder="e.g., '-B'"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="startingFloor"
            className="block text-sm font-medium text-gray-700">
            Starting Floor Number
          </label>
          <input
            type="number"
            id="startingFloor"
            {...register("startingFloor", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-gray-700">
            Room Type
          </label>
          <select
            id="type"
            {...register("type")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="">Select a type</option>
            {Object.values(RoomType).map((type) => (
              <option
                key={type}
                value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
        </div>

        <div>
          <label
            htmlFor="size"
            className="block text-sm font-medium text-gray-700">
            Size (m²)
          </label>
          <input
            type="number"
            id="size"
            step="0.01"
            {...register("size", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.size && <p className="mt-1 text-sm text-red-600">{errors.size.message}</p>}
        </div>

        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-700">
            Price per Month
          </label>
          <input
            type="number"
            id="price"
            step="0.01"
            {...register("price", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Amenities</label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {AMENITIES.map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${selectedAmenities.includes(amenity) ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"}`}>
              {amenity}
            </button>
          ))}
        </div>
        {selectedAmenities.length === 0 && <p className="mt-1 text-sm text-red-600">Please select at least one amenity</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
        {isLoading ? "Creating Rooms..." : "Create Rooms"}
      </button>
    </form>
  );
}
