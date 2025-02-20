'use client';

import { api } from '@/lib/trpc/react';
import { zodResolver } from '@hookform/resolvers/zod';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';

import { useLoadScript } from '@react-google-maps/api';
import Image from 'next/image';
import { useTranslations } from 'use-intl';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  facilities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  dueDate: z.number().min(1, 'Due date is required').max(31, 'Due date must be between 1 and 31'),
});

type PropertyFormData = z.infer<typeof propertySchema>;

// Dynamically import the map component to avoid SSR issues
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
});

// List of common facilities
const FACILITIES = [
  'AC',
  'WiFi',
  'Laundry',
  'Parking',
  'Security',
  'CCTV',
  'Kitchen',
  'Water Heater',
];

interface PropertyFormProps {
  initialData?: PropertyFormData;
}

export function PropertyForm({ initialData }: PropertyFormProps) {
  const router = useRouter();
  const t = useTranslations('properties');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places'],
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
      dueDate: 5, // Default due date is 5th of each month
    },
  });

  const selectedFacilities = watch('facilities');

  const propertyMutation = api.property.create.useMutation({
    onSuccess: () => {
      toast.success('Property created successfully!');
      router.push('/properties');
      router.refresh();
    },
    onError: error => {
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
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: PropertyFormData) => {
    // Final validation before submit
    if (!selectedLocation) {
      setCurrentStep(3);
      toast.error('Please select a location on the map');
      return;
    }

    if (selectedFacilities.length === 0) {
      setCurrentStep(4);
      toast.error('Please select at least one facility');
      return;
    }

    if (!imageFiles || imageFiles.length === 0) {
      setCurrentStep(5);
      toast.error('Please upload at least one image');
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
          formData.append('file', file);

          const response = await fetch('/api/upload/property-image', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload image');
          }

          const { url } = await response.json();
          imageUrls.push(url);
        }
      }

      // Then create the property
      await propertyMutation.mutateAsync({
        ...data,
        images: imageUrls,
        location: selectedLocation ? `${selectedLocation.lat},${selectedLocation.lng}` : '',
        dueDate: Number(data.dueDate), // Ensure dueDate is a number
      });
    } catch (error) {
      toast.error('Failed to create property');
      console.error('Error creating property:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    setSelectedLocation(location);
    setValue('location', `${location.lat},${location.lng}`);
  };

  const toggleFacility = (facility: string) => {
    const currentFacilities = watch('facilities');
    const newFacilities = currentFacilities.includes(facility)
      ? currentFacilities.filter(f => f !== facility)
      : [...currentFacilities, facility];
    setValue('facilities', newFacilities);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setImageFiles(files);

    // Create preview URLs for the selected images
    const previews: string[] = [];
    Array.from(files).forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      previews.push(previewUrl);
    });
    setImagePreviews(previews);
  };

  // Cleanup preview URLs when component unmounts
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('form.name')}</label>
              <input
                type="text"
                id="name"
                placeholder={t('form.name')}
                {...register('name')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring sm:px-4 sm:py-2.5"
              />
              {errors.name && (
                <p className="mt-1 text-xs font-medium text-destructive sm:text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('form.description')}</label>
              <textarea
                id="description"
                rows={4}
                placeholder={t('form.description')}
                {...register('description')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring sm:px-4 sm:py-2.5"
              />
              {errors.description && (
                <p className="mt-1 text-xs font-medium text-destructive sm:text-sm">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('form.address')}</label>
              <input
                type="text"
                id="address"
                placeholder={t('form.address')}
                {...register('address')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring sm:px-4 sm:py-2.5"
              />
              {errors.address && (
                <p className="mt-1 text-xs font-medium text-destructive sm:text-sm">
                  {errors.address.message}
                </p>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('form.city')}</label>
                <input
                  type="text"
                  id="city"
                  placeholder={t('form.city')}
                  {...register('city')}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring sm:px-4 sm:py-2.5"
                />
                {errors.city && (
                  <p className="mt-1 text-xs font-medium text-destructive sm:text-sm">
                    {errors.city.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('form.province')}</label>
                <input
                  type="text"
                  id="province"
                  placeholder={t('form.province')}
                  {...register('province')}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring sm:px-4 sm:py-2.5"
                />
                {errors.province && (
                  <p className="mt-1 text-xs font-medium text-destructive sm:text-sm">
                    {errors.province.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('form.postalCode')}</label>
                <input
                  type="text"
                  id="postalCode"
                  placeholder={t('form.postalCode')}
                  {...register('postalCode')}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring sm:px-4 sm:py-2.5"
                />
                {errors.postalCode && (
                  <p className="mt-1 text-xs font-medium text-destructive sm:text-sm">
                    {errors.postalCode.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">{t('form.dueDate')}</label>
                <input
                  type="number"
                  id="dueDate"
                  min="1"
                  max="31"
                  placeholder={t('form.dueDatePlaceholder')}
                  {...register('dueDate', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring sm:px-4 sm:py-2.5"
                />
                {errors.dueDate && (
                  <p className="mt-1 text-xs font-medium text-destructive sm:text-sm">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('form.selectLocation')}</label>
              <div className="h-[300px] overflow-hidden rounded-lg border border-input sm:h-[400px]">
                <Map onLocationSelect={handleLocationSelect} selectedLocation={selectedLocation} />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t('form.selectFacilities')}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 sm:gap-3">
                {FACILITIES.map(facility => (
                  <button
                    key={facility}
                    type="button"
                    onClick={() => toggleFacility(facility)}
                    className={`flex h-10 items-center justify-center rounded-lg border px-3 text-xs font-medium transition-colors sm:h-11 sm:px-4 sm:text-sm ${
                      selectedFacilities.includes(facility)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-background text-foreground hover:bg-accent'
                    }`}
                  >
                    {facility}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {t('form.uploadPropertyImages')}
              </label>
              <div className="grid gap-3 sm:gap-4">
                <div className="flex items-center justify-center">
                  <label
                    htmlFor="images"
                    className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-background px-3 transition-colors hover:bg-accent sm:h-32 sm:px-4"
                  >
                    <div className="flex flex-col items-center justify-center py-4 sm:py-5">
                      <p className="mb-1 text-xs text-foreground sm:mb-2 sm:text-sm">
                        <span className="font-semibold">{t('form.clickToUpload')}</span>{' '}
                        {t('form.orDragAndDrop')}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('form.acceptedFormats')}</p>
                    </div>
                    <input
                      id="images"
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 sm:gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        className="relative aspect-square overflow-hidden rounded-lg border border-input"
                      >
                        <Image
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="object-cover"
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const stepTitles = [
    t('form.basicInformation'),
    t('form.locationDetails'),
    t('form.mapLocation'),
    t('form.facilities'),
    t('form.images'),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
      <div className="relative mb-6 sm:mb-8">
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            {t('form.step')} {currentStep} {t('form.of')} 5: {stepTitles[currentStep - 1]}
          </h2>
          <span className="text-xs text-muted-foreground sm:text-sm">
            {calculateProgress()}% {t('form.complete')}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary sm:h-2">
          <div
            className="h-full bg-primary transition-all duration-300 ease-in-out"
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
      </div>

      {renderStepContent()}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:gap-4">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto sm:px-6 sm:py-2.5"
          >
            {t('common.back')}
          </button>
        )}
        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleNext}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto sm:px-6 sm:py-2.5"
          >
            {t('common.next')}
          </button>
        ) : (
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6 sm:py-2.5"
          >
            {isLoading ? t('common.creating') : t('form.createProperty')}
          </button>
        )}
      </div>
    </form>
  );
}
