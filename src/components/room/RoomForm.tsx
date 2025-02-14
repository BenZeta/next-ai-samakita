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
  number: z.string().min(1, "Room number is required"),
  type: z.nativeEnum(RoomType),
  size: z.number().min(1, "Size must be greater than 0"),
  amenities: z.array(z.string()).min(1, "At least one amenity is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
});

type RoomFormData = z.infer<typeof roomSchema>;

// List of common room amenities
const AMENITIES = ["Private Bathroom", "Air Conditioning", "Balcony", "TV", "Mini Fridge", "Desk", "Wardrobe", "Water Heater", "Window"];

interface RoomFormProps {
  propertyId: string;
  initialData?: RoomFormData & { id: string };
}

export function RoomForm({ propertyId, initialData }: RoomFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(initialData?.amenities || []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: initialData,
  });

  const createMutation = api.room.create.useMutation({
    onSuccess: () => {
      toast.success(initialData ? "Room updated successfully!" : "Room created successfully!");
      router.push(`/properties/${propertyId}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = api.room.update.useMutation({
    onSuccess: () => {
      toast.success("Room updated successfully!");
      router.push(`/properties/${propertyId}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: RoomFormData) => {
    setIsLoading(true);
    try {
      const roomData = {
        ...data,
        amenities: selectedAmenities,
        propertyId,
      };

      if (initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          data: roomData,
        });
      } else {
        await createMutation.mutateAsync(roomData);
      }
    } catch (error) {
      console.error("Failed to save room:", error);
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
      <div>
        <label
          htmlFor="number"
          className="block text-sm font-medium text-gray-700">
          Room Number
        </label>
        <input
          type="text"
          id="number"
          {...register("number")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.number && <p className="mt-1 text-sm text-red-600">{errors.number.message}</p>}
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
        {isLoading ? (initialData ? "Updating..." : "Creating...") : initialData ? "Update Room" : "Create Room"}
      </button>
    </form>
  );
}
