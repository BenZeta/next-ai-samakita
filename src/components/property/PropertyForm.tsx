"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { api } from "@/lib/trpc/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useLoadScript } from "@react-google-maps/api";
import Image from "next/image";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const propertySchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  facilities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  dueDate: z.number().min(1, "Due date is required").max(31, "Due date must be between 1 and 31"),
});

type PropertyFormData = z.infer<typeof propertySchema>;

// Dynamically import the map component to avoid SSR issues
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
});

// List of common facilities
const FACILITIES = ["AC", "WiFi", "Laundry", "Parking", "Security", "CCTV", "Kitchen", "Water Heater"];

export function PropertyForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ["places"],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      facilities: [],
      images: [],
    },
  });

  const selectedFacilities = watch("facilities");

  const propertyMutation = api.property.create.useMutation({
    onSuccess: () => {
      toast.success("Property created successfully!");
      router.push("/properties");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: PropertyFormData) => {
    if (!selectedLocation) {
      toast.error("Please select a location on the map");
      return;
    }

    setIsLoading(true);
    try {
      // First upload images
      const imageUrls: string[] = [];
      if (imageFiles) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload/property-image", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Failed to upload image");
          }

          const { url } = await response.json();
          imageUrls.push(url);
        }
      }

      // Then create the property
      await propertyMutation.mutateAsync({
        ...data,
        images: imageUrls,
        location: selectedLocation ? `${selectedLocation.lat},${selectedLocation.lng}` : "",
      });
    } catch (error) {
      toast.error("Failed to create property");
      console.error("Error creating property:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    setSelectedLocation(location);
    setValue("location", `${location.lat},${location.lng}`);
  };

  const toggleFacility = (facility: string) => {
    const currentFacilities = watch("facilities");
    const newFacilities = currentFacilities.includes(facility) ? currentFacilities.filter((f) => f !== facility) : [...currentFacilities, facility];
    setValue("facilities", newFacilities);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setImageFiles(files);

    // Create preview URLs for the selected images
    const previews: string[] = [];
    Array.from(files).forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      previews.push(previewUrl);
    });
    setImagePreviews(previews);
  };

  // Cleanup preview URLs when component unmounts
  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700">
          Property Name
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
          htmlFor="description"
          className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          {...register("description")}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div>
        <label
          htmlFor="address"
          className="block text-sm font-medium text-gray-700">
          Address
        </label>
        <textarea
          id="address"
          {...register("address")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>}
      </div>

      <div>
        <label
          htmlFor="city"
          className="block text-sm font-medium text-gray-700">
          City
        </label>
        <input
          type="text"
          id="city"
          {...register("city")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}
      </div>

      <div>
        <label
          htmlFor="province"
          className="block text-sm font-medium text-gray-700">
          Province
        </label>
        <input
          type="text"
          id="province"
          {...register("province")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.province && <p className="mt-1 text-sm text-red-600">{errors.province.message}</p>}
      </div>

      <div>
        <label
          htmlFor="postalCode"
          className="block text-sm font-medium text-gray-700">
          Postal Code
        </label>
        <input
          type="text"
          id="postalCode"
          {...register("postalCode")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.postalCode && <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>}
      </div>

      <div>
        <label
          htmlFor="dueDate"
          className="block text-sm font-medium text-gray-700">
          Rent Due Date (Day of Month)
        </label>
        <input
          type="number"
          id="dueDate"
          min="1"
          max="31"
          {...register("dueDate", { valueAsNumber: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Location</label>
        <div className="mt-1 aspect-video w-full rounded-md border border-gray-300">
          <Map onLocationSelect={handleLocationSelect} />
        </div>
        {!selectedLocation && <p className="mt-1 text-sm text-red-600">Please select a location on the map</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Facilities</label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {FACILITIES.map((facility) => (
            <button
              key={facility}
              type="button"
              onClick={() => toggleFacility(facility)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${selectedFacilities.includes(facility) ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"}`}>
              {facility}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Images</label>
        <input
          type="file"
          accept={ACCEPTED_FILE_TYPES.join(",")}
          multiple
          onChange={handleImageChange}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="mt-1 text-sm text-gray-500">Maximum file size: 5MB. Accepted formats: JPEG, PNG, WebP</p>

        {imagePreviews.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {imagePreviews.map((preview, index) => (
              <div
                key={index}
                className="relative aspect-video">
                <Image
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  fill
                  className="rounded-lg object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
          {isLoading ? "Creating..." : "Create Property"}
        </button>
      </div>
    </form>
  );
}
