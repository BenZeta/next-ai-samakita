'use client';

import { api } from '@/lib/trpc/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';
import { z } from 'zod';

// Define common duration options
const DURATION_OPTIONS = [1, 3, 6, 12];

// Define frequency options with conversion factors
const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Monthly', factor: 1 },
  { value: 3, label: 'Quarterly', factor: 3 },
  { value: 6, label: 'Biannually', factor: 6 },
  { value: 12, label: 'Annually', factor: 12 },
];

const roomSchema = z
  .object({
    number: z.string().min(1, 'validation.numberRequired'),
    type: z.enum(['SUITE', 'STUDIO', 'STANDARD', 'DELUXE', 'CUSTOM'], {
      errorMap: () => ({ message: 'validation.typeRequired' }),
    }),
    customTypeName: z.string().optional(),
    size: z.coerce.number().min(1, 'validation.sizeRequired'),
    amenities: z.array(z.string()).min(1, 'validation.amenitiesRequired'),
    price: z.coerce.number().min(0, 'validation.priceRequired'),
    frequency: z.number().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'CUSTOM' && (!data.customTypeName || data.customTypeName.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.customTypeNameRequired',
        path: ['customTypeName'],
      });
    }
  });

type RoomFormData = z.infer<typeof roomSchema>;

// Interface for price tier
interface PriceTier {
  id?: string; // Optional for new entries
  duration: number; // in months
  price: number;
  isDefault: boolean;
}

interface RoomFormProps {
  propertyId: string;
  initialData?: {
    id?: string;
    number: string;
    size: number;
    amenities: string[];
    price: number;
    type: 'SUITE' | 'STUDIO' | 'STANDARD' | 'DELUXE' | 'CUSTOM';
    priceTiers?: PriceTier[];
  };
}

export function RoomForm({ propertyId, initialData }: RoomFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    initialData?.amenities || []
  );
  const [customAmenity, setCustomAmenity] = useState('');
  const [formattedPrice, setFormattedPrice] = useState(
    initialData?.price ? initialData.price.toLocaleString() : ''
  );
  // Get default frequency
  const defaultFrequency = initialData?.priceTiers?.find(pt => pt.isDefault)?.duration || 1;
  const [frequency, setFrequency] = useState(defaultFrequency);

  const t = useTranslations('properties.room');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      ...initialData,
      size: initialData?.size || undefined,
      price: initialData?.price || undefined,
      amenities: initialData?.amenities || [],
      frequency: defaultFrequency,
    },
  });

  // Watch the type field to conditionally show the custom type name input
  const selectedType = watch('type');

  const createMutation = api.room.create.useMutation({
    onSuccess: () => {
      toast.success(t('toast.created'));
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
      toast.success(t('toast.updated'));
      router.push(`/properties/${propertyId}`);
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  // Fetch existing custom room types
  const { data: customTypes } = api.room.getCustomTypes.useQuery({
    propertyId,
  });

  const formatPrice = (value: string) => {
    // Remove non-digit characters
    const number = value.replace(/\D/g, '');
    // Format with thousand separators
    return number ? parseInt(number).toLocaleString() : '';
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value);
    setFormattedPrice(formatted);
    // Set the actual numeric value in the form
    setValue('price', formatted ? parseInt(formatted.replace(/\D/g, '')) : 0, {
      shouldValidate: true,
    });
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFrequency = parseInt(e.target.value);
    setFrequency(newFrequency);
    setValue('frequency', newFrequency, { shouldValidate: true });
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
    setValue('amenities', selectedAmenities, { shouldValidate: true });
  };

  const addCustomAmenity = () => {
    if (customAmenity.trim() && !selectedAmenities.includes(customAmenity.trim())) {
      const updatedAmenities = [...selectedAmenities, customAmenity.trim()];
      setSelectedAmenities(updatedAmenities);
      setValue('amenities', updatedAmenities, { shouldValidate: true });
      setCustomAmenity('');
    }
  };

  const onSubmit = async (data: RoomFormData) => {
    try {
      setIsLoading(true);
      setValue('amenities', selectedAmenities);

      // Calculate price tiers based on the single price and frequency
      const calculatedPriceTiers = DURATION_OPTIONS.map(duration => {
        const factor = data.frequency;
        let price = data.price;

        // If the duration is different from the selected frequency,
        // adjust the price proportionally
        if (duration !== factor) {
          price = Math.round((price / factor) * duration);
        }

        return {
          duration,
          price,
          isDefault: duration === factor,
          id: initialData?.priceTiers?.find(pt => pt.duration === duration)?.id,
        };
      });

      const fullRoomData = {
        ...data,
        propertyId,
        priceTiers: calculatedPriceTiers,
      };

      if (initialData?.id) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          data: fullRoomData,
        });
      } else {
        await createMutation.mutateAsync(fullRoomData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsLoading(false);
    }
  };

  const AMENITIES = [
    t('amenities.bathroom'),
    t('amenities.ac'),
    t('amenities.balcony'),
    t('amenities.tv'),
    t('amenities.fridge'),
    t('amenities.desk'),
    t('amenities.wardrobe'),
    t('amenities.waterHeater'),
    t('amenities.window'),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-2">
        <label htmlFor="number" className="text-sm font-medium">
          {t('form.number')}
        </label>
        <input
          id="number"
          type="text"
          className={`rounded-md border p-2 bg-background ${
            errors.number ? 'border-red-500' : 'border-input'
          }`}
          {...register('number')}
        />
        {errors.number && <p className="text-sm text-red-500">{t(errors.number.message)}</p>}
      </div>

      <div className="grid gap-2">
        <label htmlFor="type" className="text-sm font-medium">
          {t('form.type')}
        </label>
        <select
          id="type"
          className={`rounded-md border p-2 bg-background ${
            errors.type ? 'border-red-500' : 'border-input'
          }`}
          {...register('type')}
        >
          <option value="STANDARD">{t('form.types.standard')}</option>
          <option value="SUITE">{t('form.types.suite')}</option>
          <option value="STUDIO">{t('form.types.studio')}</option>
          <option value="DELUXE">{t('form.types.deluxe')}</option>
          <option value="CUSTOM">{t('form.types.custom')}</option>
        </select>
        {errors.type && <p className="text-sm text-red-500">{t(errors.type.message)}</p>}
      </div>

      {selectedType === 'CUSTOM' && (
        <div className="grid gap-2">
          <label htmlFor="customTypeName" className="text-sm font-medium">
            {t('form.customTypeName')}
          </label>
          <div className="grid grid-cols-1 gap-2">
            {/* Custom type input with datalist for suggestions */}
            <input
              id="customTypeName"
              type="text"
              list="customTypesList"
              className={`rounded-md border p-2 bg-background ${
                errors.customTypeName ? 'border-red-500' : 'border-input'
              }`}
              {...register('customTypeName')}
            />
            {/* Datalist with existing custom types */}
            <datalist id="customTypesList">
              {customTypes?.map((type, index) => <option key={index} value={type} />)}
            </datalist>
            {errors.customTypeName && (
              <p className="text-sm text-red-500">{t(errors.customTypeName.message)}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <label htmlFor="size" className="text-sm font-medium">
          {t('form.size')}
        </label>
        <div className="flex">
          <input
            id="size"
            type="number"
            className={`w-full rounded-md border p-2 bg-background ${
              errors.size ? 'border-red-500' : 'border-input'
            }`}
            min={1}
            {...register('size', { valueAsNumber: true })}
          />
          <span className="ml-2 flex items-center text-sm text-muted-foreground">m²</span>
        </div>
        {errors.size && <p className="text-sm text-red-500">{t(errors.size.message)}</p>}
      </div>

      <div className="grid gap-2">
        <label htmlFor="price" className="text-sm font-medium">
          {t('form.price')}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="price"
              type="text"
              className={`w-full rounded-md border p-2 pl-8 bg-background ${
                errors.price ? 'border-red-500' : 'border-input'
              }`}
              value={formattedPrice}
              onChange={handlePriceChange}
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              Rp
            </span>
          </div>
          <select
            id="frequency"
            className="rounded-md border border-input p-2 bg-background"
            value={frequency}
            onChange={handleFrequencyChange}
          >
            {FREQUENCY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {t(`form.frequency.${option.label.toLowerCase()}`)}
              </option>
            ))}
          </select>
        </div>
        {errors.price && <p className="text-sm text-red-500">{t(errors.price.message)}</p>}
        <p className="text-sm text-muted-foreground">
          {t('form.priceDescription', {
            frequency: t(
              `form.frequency.${FREQUENCY_OPTIONS.find(f => f.value === frequency)?.label.toLowerCase() || 'monthly'}`
            ),
          })}
        </p>
      </div>

      <div>
        <label htmlFor="amenities" className="text-sm font-medium">
          {t('amenitiesLabel')}
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {AMENITIES.map(amenity => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                selectedAmenities.includes(amenity)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {amenity}
            </button>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={customAmenity}
            onChange={e => setCustomAmenity(e.target.value)}
            placeholder={t('amenities.custom')}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustomAmenity}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('amenities.add')}
          </button>
        </div>

        {selectedAmenities.filter(a => !AMENITIES.includes(a)).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedAmenities
              .filter(a => !AMENITIES.includes(a))
              .map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {amenity}
                </button>
              ))}
          </div>
        )}

        {errors.amenities && (
          <p className="mt-1 text-sm text-red-600">{t('validation.amenitiesRequired')}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading
            ? initialData
              ? t('updating')
              : t('creating')
            : initialData
              ? t('update')
              : t('create')}
        </button>
      </div>
    </form>
  );
}
