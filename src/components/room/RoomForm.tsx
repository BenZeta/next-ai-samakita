'use client';

import { api } from '@/lib/trpc/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoomType } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';

const roomSchema = z.object({
  number: z.string().min(1, 'Room number is required'),
  type: z.nativeEnum(RoomType),
  size: z.coerce.number().min(1, 'Size must be greater than 0'),
  amenities: z.array(z.string()).min(1, 'At least one amenity is required'),
  price: z.coerce.number().min(0, 'Price must be greater than or equal to 0'),
});

type RoomFormData = z.infer<typeof roomSchema>;

// List of common room amenities
const AMENITIES = [
  'Private Bathroom',
  'Air Conditioning',
  'Balcony',
  'TV',
  'Mini Fridge',
  'Desk',
  'Wardrobe',
  'Water Heater',
  'Window',
];

interface RoomFormProps {
  propertyId: string;
  initialData?: RoomFormData & { id: string };
}

export function RoomForm({ propertyId, initialData }: RoomFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    initialData?.amenities || []
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      ...initialData,
      size: initialData?.size || undefined,
      price: initialData?.price || undefined,
      amenities: initialData?.amenities || [],
    },
  });

  const createMutation = api.room.create.useMutation({
    onSuccess: () => {
      toast.success(initialData ? 'Room updated successfully!' : 'Room created successfully!');
      router.push(`/properties/${propertyId}`);
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const updateMutation = api.room.update.useMutation({
    onSuccess: () => {
      toast.success('Room updated successfully!');
      router.push(`/properties/${propertyId}`);
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const onSubmit = async (data: RoomFormData) => {
    try {
      setIsLoading(true);

      // Update the amenities in the form data
      setValue('amenities', selectedAmenities);

      const roomData = {
        ...data,
        amenities: selectedAmenities,
        propertyId,
      };

      console.log('Submitting room data:', roomData);

      if (initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          data: roomData,
        });
      } else {
        await createMutation.mutateAsync(roomData);
      }
    } catch (error) {
      console.error('Failed to save room:', error);
      toast.error('Failed to save room. Please check the form and try again.');
      setIsLoading(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter(a => a !== amenity)
      : [...selectedAmenities, amenity];

    setSelectedAmenities(newAmenities);
    setValue('amenities', newAmenities, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="number" className="block text-sm font-medium text-foreground">
          Room Number
        </label>
        <input
          type="text"
          id="number"
          {...register('number')}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
        {errors.number && <p className="mt-1 text-sm text-red-600">{errors.number.message}</p>}
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-foreground">
          Room Type
        </label>
        <select
          id="type"
          {...register('type')}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value="">Select a type</option>
          {Object.values(RoomType).map(type => (
            <option key={type} value={type}>
              {type.charAt(0) + type.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
      </div>

      <div>
        <label htmlFor="size" className="block text-sm font-medium text-foreground">
          Size (m²)
        </label>
        <input
          type="number"
          id="size"
          {...register('size')}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
        {errors.size && <p className="mt-1 text-sm text-red-600">{errors.size.message}</p>}
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium text-foreground">
          Price per Month
        </label>
        <input
          type="number"
          id="price"
          {...register('price')}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
        {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">Amenities</label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {AMENITIES.map(amenity => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                selectedAmenities.includes(amenity)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {amenity}
            </button>
          ))}
        </div>
        {errors.amenities && (
          <p className="mt-1 text-sm text-red-600">{errors.amenities.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading
          ? initialData
            ? 'Updating...'
            : 'Creating...'
          : initialData
            ? 'Update Room'
            : 'Create Room'}
      </button>
    </form>
  );
}
