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
  const [currentStep, setCurrentStep] = useState(1);

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
    trigger,
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

  const calculateProgress = () => {
    const completedSteps = currentStep - 1;
    return Math.round((completedSteps / 5) * 100);
  };

  const validateStep = async () => {
    let isValid = true;
    switch (currentStep) {
      case 1:
        isValid = await trigger(['name', 'description', 'address']);
        break;
      case 2:
        isValid = await trigger(['city', 'province', 'postalCode', 'dueDate']);
        break;
      case 3:
      case 4:
      case 5:
        isValid = true; // Validasi map, facilities, dan images hanya saat submit
        break;
      default:
        isValid = true;
    }
    return isValid;
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: PropertyFormData) => {
    // Final validation before submit
    if (!selectedLocation) {
      setCurrentStep(3);
      toast.error("Please select a location on the map");
      return;
    }

    if (selectedFacilities.length === 0) {
      setCurrentStep(4);
      toast.error("Please select at least one facility");
      return;
    }

    if (!imageFiles || imageFiles.length === 0) {
      setCurrentStep(5);
      toast.error("Please upload at least one image");
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-900">
                Property Name
              </label>
              <input
                type="text"
                id="name"
                placeholder="Enter property name"
                {...register("name")}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              {errors.name && <p className="mt-1.5 text-sm font-medium text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-900">
                Description
              </label>
              <textarea
                id="description"
                placeholder="Enter property description"
                {...register("description")}
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              {errors.description && <p className="mt-1.5 text-sm font-medium text-red-500">{errors.description.message}</p>}
            </div>

            <div>
              <label htmlFor="address" className="mb-2 block text-sm font-medium text-gray-900">
                Address
              </label>
              <textarea
                id="address"
                placeholder="Enter property address"
                {...register("address")}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              {errors.address && <p className="mt-1.5 text-sm font-medium text-red-500">{errors.address.message}</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="mb-2 block text-sm font-medium text-gray-900">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  placeholder="Enter city"
                  {...register("city")}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
                {errors.city && <p className="mt-1.5 text-sm font-medium text-red-500">{errors.city.message}</p>}
              </div>

              <div>
                <label htmlFor="province" className="mb-2 block text-sm font-medium text-gray-900">
                  Province
                </label>
                <input
                  type="text"
                  id="province"
                  placeholder="Enter province"
                  {...register("province")}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
                {errors.province && <p className="mt-1.5 text-sm font-medium text-red-500">{errors.province.message}</p>}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="postalCode" className="mb-2 block text-sm font-medium text-gray-900">
                  Postal Code
                </label>
                <input
                  type="text"
                  id="postalCode"
                  placeholder="Enter postal code"
                  {...register("postalCode")}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
                {errors.postalCode && <p className="mt-1.5 text-sm font-medium text-red-500">{errors.postalCode.message}</p>}
              </div>

              <div>
                <label htmlFor="dueDate" className="mb-2 block text-sm font-medium text-gray-900">
                  Rent Due Date
                </label>
                <input
                  type="number"
                  id="dueDate"
                  placeholder="Enter due date (1-31)"
                  min="1"
                  max="31"
                  {...register("dueDate", { valueAsNumber: true })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
                {errors.dueDate && <p className="mt-1.5 text-sm font-medium text-red-500">{errors.dueDate.message}</p>}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="aspect-video w-full">
                <Map onLocationSelect={handleLocationSelect} />
              </div>
            </div>
            {!selectedLocation && <p className="text-sm font-medium text-red-500">Please select a location on the map</p>}
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {FACILITIES.map((facility) => (
              <button
                key={facility}
                type="button"
                onClick={() => toggleFacility(facility)}
                className={`flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  selectedFacilities.includes(facility)
                    ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600"
                    : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:ring-gray-300"
                }`}>
                {facility}
              </button>
            ))}
          </div>
        );
      case 5:
        return (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6">
            <input
              type="file"
              accept={ACCEPTED_FILE_TYPES.join(",")}
              multiple
              onChange={handleImageChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-indigo-600 hover:file:bg-indigo-100"
            />
            <p className="mt-2 text-xs text-gray-500">Maximum file size: 5MB</p>

            {imagePreviews.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="group relative aspect-video overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const stepTitles = [
    "Basic Information",
    "Location Details",
    "Map Location",
    "Facilities",
    "Images"
  ];

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Create New Property</h2>
          <p className="mt-1 text-sm text-gray-500">Step {currentStep} of 5: {stepTitles[currentStep - 1]}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">{calculateProgress()}% Complete</span>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
            <div 
              className="h-full rounded-full bg-indigo-600 transition-all duration-300" 
              style={{ width: `${calculateProgress()}%` }}>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="text-base font-medium text-gray-900">{stepTitles[currentStep - 1]}</h3>
          <p className="mt-1 text-sm text-gray-500">Fill in the details below</p>
        </div>
        <div className="p-6">
          {renderStepContent()}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className={`rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${currentStep === 1 ? 'invisible' : ''}`}>
          Back
        </button>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900">
            Cancel
          </button>
          {currentStep === 5 ? (
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              {isLoading ? "Creating..." : "Create Property"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Next
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
