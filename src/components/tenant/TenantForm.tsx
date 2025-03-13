'use client';

import { countryCodes } from '@/lib/constants/countryCodes';
import { api } from '@/lib/trpc/react';
import {
  calculatePriceWithFrequency,
  findAppropriateRoomPriceTier,
} from '@/lib/utils/price-tier-calculations';
import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentFrequency } from '@prisma/client';
import { ChevronsUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';
import { z } from 'zod';

// Interface for price tier from the Room model
interface PriceTier {
  id: string;
  duration: number;
  price: number;
  isDefault: boolean;
}

const tenantFormSchema = z.object({
  name: z.string().min(1, 'properties.tenant.form.validation.nameRequired'),
  email: z.string().email('properties.tenant.form.validation.emailInvalid'),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'properties.tenant.form.validation.phoneInvalid'),
  ktpNumber: z.string().optional(),
  depositAmount: z.number().min(1, 'properties.tenant.form.validation.depositRequired'),
  startDate: z.string().min(1, 'properties.tenant.form.validation.startDateRequired'),
  endDate: z.string().min(1, 'properties.tenant.form.validation.endDateRequired'),
  references: z.array(z.string()).optional(),
  paymentFrequency: z.nativeEnum(PaymentFrequency).default(PaymentFrequency.MONTHLY),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

interface TenantFormProps {
  onSuccess?: () => void;
  roomId: string;
}

export function TenantForm({ onSuccess, roomId }: TenantFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [kkFile, setKkFile] = useState<File | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(
    countryCodes.find(c => c.code === 'ID') || countryCodes[0]
  );
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const createMutation = api.tenant.create.useMutation();
  const t = useTranslations();

  // Fetch room details to get the price and the property info (for default payment frequency)
  const { data: room } = api.room.get.useQuery({ id: roomId });
  const { data: property } = api.property.get.useQuery(
    { id: room?.propertyId || '' },
    { enabled: !!room?.propertyId }
  );

  // Calculate lease duration and selected price
  const [leaseDuration, setLeaseDuration] = useState<number>(1); // Default to 1 month
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [selectedPriceTier, setSelectedPriceTier] = useState<PriceTier | null>(null);
  const [originalPriceTier, setOriginalPriceTier] = useState<PriceTier | null>(null);
  const [originalFrequency, setOriginalFrequency] = useState<PaymentFrequency>(
    PaymentFrequency.MONTHLY
  );
  const [originalDuration, setOriginalDuration] = useState<number>(1);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      references: [],
      paymentFrequency: PaymentFrequency.MONTHLY,
    },
  });

  // Watch the startDate, endDate, and paymentFrequency fields
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const paymentFrequency = watch('paymentFrequency');

  // Set property's default payment frequency when the property data is loaded
  useEffect(() => {
    if (property && property.paymentFrequency) {
      setValue('paymentFrequency', property.paymentFrequency);
    }
  }, [property, setValue]);

  // Set the original frequency and price tier based on the room's price tiers
  useEffect(() => {
    if (room) {
      if (room.priceTiers && room.priceTiers.length > 0) {
        // Find the default price tier for display purposes
        const defaultTier = room.priceTiers.find(tier => tier.isDefault);
        if (defaultTier) {
          setOriginalPriceTier(defaultTier);

          // Map tier duration to payment frequency
          let frequency: PaymentFrequency = PaymentFrequency.MONTHLY;

          if (defaultTier.duration === 1) frequency = PaymentFrequency.MONTHLY;
          else if (defaultTier.duration === 3)
            frequency = PaymentFrequency.QUARTERLY as PaymentFrequency;
          else if (defaultTier.duration === 6)
            frequency = PaymentFrequency.SEMIANNUAL as PaymentFrequency;
          else if (defaultTier.duration === 12)
            frequency = PaymentFrequency.ANNUAL as PaymentFrequency;

          setOriginalFrequency(frequency);
          setOriginalDuration(defaultTier.duration);
        }
      } else if (property && property.paymentFrequency) {
        // If no price tiers, use property's default payment frequency
        setOriginalFrequency(property.paymentFrequency);
      }
    }
  }, [room, property]);

  // Calculate the lease duration and update price when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Calculate months between dates
      const months =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

      setLeaseDuration(months > 0 ? months : 1);
    }
  }, [startDate, endDate]);

  // Update selected price based on lease duration, payment frequency, and room price tiers
  useEffect(() => {
    if (room) {
      if (room.priceTiers && room.priceTiers.length > 0) {
        // Find appropriate price tier based on lease duration
        const priceTier = findAppropriateRoomPriceTier(room.priceTiers, leaseDuration);

        setSelectedPriceTier(priceTier);

        // Calculate price adjusted for payment frequency
        const adjustedPrice = calculatePriceWithFrequency(
          priceTier,
          paymentFrequency,
          leaseDuration
        );

        setSelectedPrice(adjustedPrice > 0 ? adjustedPrice : room.price);
      } else {
        // If no price tiers, use the default room price adjusted for payment frequency
        // For frequency adjustment, we treat the room price as monthly price
        import('@/lib/utils/payment-calculations').then(({ adjustAmountForFrequency }) => {
          const adjustedPrice = adjustAmountForFrequency(room.price, paymentFrequency);
          setSelectedPrice(adjustedPrice);
        });
      }
    }
  }, [room, leaseDuration, paymentFrequency]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCountryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Update the phone field whenever country code or phone number changes
    setValue('phone', `${selectedCountry.dial_code}${phoneNumber}`);
  }, [selectedCountry, phoneNumber, setValue]);

  const onSubmit = async (data: TenantFormData) => {
    try {
      setIsSubmitting(true);

      if (!room) {
        toast.error(t('rooms.tenants.new.form.roomError'));
        return;
      }

      if (selectedPrice === null) {
        toast.error('Could not determine rent amount');
        return;
      }

      // Create tenant with selected price and payment frequency
      await createMutation.mutateAsync({
        ...data,
        roomId,
        rentAmount: selectedPrice,
        paymentFrequency: data.paymentFrequency,
        leaseDuration,
      });

      toast.success(t('rooms.tenants.new.form.success'));
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/tenants');
      }
    } catch (error) {
      console.error('Failed to save tenant:', error);
      toast.error(t('rooms.tenants.new.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            {t('rooms.tenants.new.form.name')}
          </label>
          <input
            type="text"
            id="name"
            {...register('name')}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-destructive">
              {t('rooms.tenants.new.form.validation.name')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            {t('rooms.tenants.new.form.email')}
          </label>
          <input
            type="email"
            id="email"
            {...register('email')}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-destructive">
              {t('rooms.tenants.new.form.validation.email')}
            </p>
          )}
        </div>

        <div className="col-span-full sm:col-span-2">
          <label htmlFor="phone" className="block text-sm font-medium text-foreground">
            {t('rooms.tenants.new.form.phone')}
          </label>
          <div className="relative mt-1 flex w-full flex-col xs:flex-row items-start xs:items-center gap-2">
            <div className="relative w-full xs:w-auto" ref={countryDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="flex w-full xs:w-auto h-[42px] items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <span className="text-base">{selectedCountry.flag}</span>
                <span className="text-sm font-medium">{selectedCountry.dial_code}</span>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {isCountryDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-[250px] overflow-auto rounded-lg border border-input bg-card p-1 shadow-md">
                  {countryCodes.map(country => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country);
                        setIsCountryDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <span className="text-base">{country.flag}</span>
                      <span className="font-medium">{country.name}</span>
                      <span className="ml-auto text-sm text-muted-foreground">
                        {country.dial_code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setPhoneNumber(value);
              }}
              className="h-[42px] w-full rounded-lg border border-input bg-background px-3 text-foreground shadow-sm transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('rooms.tenants.new.form.phoneNumber')}
            />
          </div>
          {errors.phone && (
            <p className="mt-1 text-sm text-destructive">
              {t('rooms.tenants.new.form.validation.phone')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="ktpNumber" className="block text-sm font-medium text-foreground">
            {t('rooms.tenants.new.form.ktpNumber')}
          </label>
          <input
            type="text"
            id="ktpNumber"
            {...register('ktpNumber')}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.ktpNumber && (
            <p className="mt-1 text-sm text-destructive">{t(errors.ktpNumber.message!)}</p>
          )}
        </div>

        <div>
          <label htmlFor="depositAmount" className="block text-sm font-medium text-foreground">
            {t('rooms.tenants.new.form.depositAmount')}
          </label>
          <input
            type="number"
            id="depositAmount"
            {...register('depositAmount', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.depositAmount && (
            <p className="mt-1 text-sm text-destructive">
              {t('rooms.tenants.new.form.validation.depositAmount')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-foreground">
            {t('rooms.tenants.new.form.startDate')}
          </label>
          <input
            type="date"
            id="startDate"
            {...register('startDate')}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-destructive">
              {t('rooms.tenants.new.form.validation.startDate')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-foreground">
            {t('rooms.tenants.new.form.endDate')}
          </label>
          <input
            type="date"
            id="endDate"
            {...register('endDate')}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-destructive">
              {t('rooms.tenants.new.form.validation.endDate')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="paymentFrequency" className="block text-sm font-medium text-foreground">
            {t('rooms.tenants.new.form.paymentFrequency')}
          </label>
          <select
            id="paymentFrequency"
            {...register('paymentFrequency')}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="DAILY">{t('dashboard.calendar.frequencies.daily')}</option>
            <option value="WEEKLY">{t('dashboard.calendar.frequencies.weekly')}</option>
            <option value="BIWEEKLY">{t('dashboard.calendar.frequencies.biWeekly')}</option>
            <option value="MONTHLY">{t('dashboard.calendar.frequencies.monthly')}</option>
            <option value="QUARTERLY">{t('dashboard.calendar.frequencies.quarterly')}</option>
            <option value="SEMIANNUAL">{t('dashboard.calendar.frequencies.semiAnnual')}</option>
            <option value="ANNUAL">{t('dashboard.calendar.frequencies.annual')}</option>
            <option value="CUSTOM">{t('dashboard.calendar.frequencies.custom')}</option>
          </select>
        </div>

        <div className="col-span-full mt-4 p-4 bg-muted/30 rounded-lg">
          <h3 className="text-lg font-medium mb-3">{t('rooms.tenants.new.form.priceSummary')}</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('rooms.tenants.new.form.leaseDuration')}
              </p>
              <p className="font-medium">
                {leaseDuration} {leaseDuration === 1 ? t('common.month') : t('common.months')}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                {t('rooms.tenants.new.form.paymentFrequency')}
              </p>
              <p className="font-medium">
                {t(`dashboard.calendar.frequencies.${paymentFrequency.toLowerCase()}`)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                {t('rooms.tenants.new.form.basePrice')}
              </p>
              <p className="font-medium">
                {originalPriceTier
                  ? `Rp ${originalPriceTier.price.toLocaleString()} / ${t(`dashboard.calendar.frequencies.${originalFrequency.toLowerCase()}`)}`
                  : room
                    ? `Rp ${room.price.toLocaleString()} / ${t(`dashboard.calendar.frequencies.${originalFrequency.toLowerCase()}`)}`
                    : '-'}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                {t('rooms.tenants.new.form.adjustedPrice')}
              </p>
              <p className="font-medium text-primary">
                {selectedPrice ? `Rp ${selectedPrice.toLocaleString()}` : '-'}
                {paymentFrequency &&
                  ` / ${t(`dashboard.calendar.frequencies.${paymentFrequency.toLowerCase()}`)}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          type="submit"
          disabled={isSubmitting || !room || selectedPrice === null}
          className="inline-flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        >
          {isSubmitting
            ? t('rooms.tenants.new.form.submit.loading')
            : t('rooms.tenants.new.form.submit.create')}
        </button>
      </div>
    </form>
  );
}
