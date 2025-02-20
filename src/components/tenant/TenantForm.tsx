'use client';

import { countryCodes } from '@/lib/constants/countryCodes';
import { api } from '@/lib/trpc/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronsUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';
import { z } from 'zod';

const tenantFormSchema = z.object({
  name: z.string().min(1, 'properties.tenant.form.validation.nameRequired'),
  email: z.string().email('properties.tenant.form.validation.emailInvalid'),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'properties.tenant.form.validation.phoneInvalid'),
  ktpNumber: z.string().optional(),
  depositAmount: z.number().min(1, 'properties.tenant.form.validation.depositRequired'),
  startDate: z.string().min(1, 'properties.tenant.form.validation.startDateRequired'),
  endDate: z.string().min(1, 'properties.tenant.form.validation.endDateRequired'),
  references: z.array(z.string()).optional(),
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

  // Fetch room details to get the price
  const { data: room } = api.room.get.useQuery({ id: roomId });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      references: [],
    },
  });

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

      // Create tenant with room price
      await createMutation.mutateAsync({
        ...data,
        roomId,
        rentAmount: room.price,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground">
            {t('rooms.tenants.new.form.phone')}
          </label>
          <div className="relative mt-1 flex w-full items-center gap-2">
            <div className="relative" ref={countryDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="flex h-[42px] items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="h-[42px] flex-1 rounded-lg border border-input bg-background px-3 text-foreground shadow-sm transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring"
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

        {room && (
          <div>
            <label className="block text-sm font-medium text-foreground">
              {t('rooms.tenants.new.form.rentAmount')}
            </label>
            <p className="mt-2 text-lg font-medium text-primary">
              {t('properties.tenant.form.priceValue', { value: room.price.toLocaleString() })}
            </p>
          </div>
        )}

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
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting || !room}
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
