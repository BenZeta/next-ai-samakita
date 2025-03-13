'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/trpc/react';
import { calculateNextPaymentDate } from '@/lib/utils/payment-calculations';
import { PaymentFrequency } from '@prisma/client';
import { addMonths, format } from 'date-fns';
import { CreditCard, Settings, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'use-intl';

interface PaymentScheduleVisualizerProps {
  propertyId?: string;
}

// Define payment frequency options
const FREQUENCIES: { value: PaymentFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMIANNUAL', label: 'Semi-Annual' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function PaymentScheduleVisualizer({ propertyId }: PaymentScheduleVisualizerProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<PaymentFrequency>('MONTHLY');
  const [simulationBaseDate, setSimulationBaseDate] = useState<Date>(new Date());

  // For custom frequency
  const [customDays, setCustomDays] = useState<number[]>([1, 15]);

  // Get property data if propertyId is provided
  const { data: propertyData } = api.property.get.useQuery(
    { id: propertyId || '' },
    { enabled: !!propertyId }
  );

  // Generate schedule for the next 12 payment dates based on selected frequency
  const paymentDates = useMemo(() => {
    const dates: Date[] = [];
    let currentDate = new Date(simulationBaseDate);

    // For custom frequency, use the property's custom payment days or the default
    const customPaymentDays =
      propertyId && propertyData ? propertyData.customPaymentDays : customDays;

    // Generate 12 payment dates
    for (let i = 0; i < 12; i++) {
      currentDate = calculateNextPaymentDate(currentDate, activeTab, customPaymentDays);
      dates.push(new Date(currentDate));
    }

    return dates;
  }, [activeTab, simulationBaseDate, propertyId, propertyData, customDays]);

  // Calculate payment amounts based on frequency (assuming monthly base of 1,000,000)
  const getPaymentAmount = (frequency: PaymentFrequency): number => {
    const baseAmount = 1000000; // Rp 1,000,000 as monthly base

    switch (frequency) {
      case 'DAILY':
        return baseAmount / 30;
      case 'WEEKLY':
        return (baseAmount * 12) / 52;
      case 'BIWEEKLY':
        return (baseAmount * 12) / 26;
      case 'MONTHLY':
        return baseAmount;
      case 'QUARTERLY':
        return baseAmount * 3;
      case 'SEMIANNUAL':
        return baseAmount * 6;
      case 'ANNUAL':
        return baseAmount * 12;
      case 'CUSTOM':
        // For custom, assume average of monthly divided by number of payments per month
        return baseAmount / (customDays.length || 1);
      default:
        return baseAmount;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate timeline view of payments
  const renderPaymentTimeline = () => {
    const today = new Date();
    const oneYearFromNow = addMonths(today, 12);

    return (
      <div className="relative mt-4">
        {/* Timeline axis */}
        <div className="absolute left-0 top-6 h-0.5 w-full bg-border"></div>

        {/* Payment markers */}
        <div className="relative flex justify-between">
          {paymentDates.slice(0, 6).map((date, index) => {
            const isPast = date < today;
            const daysPassed = Math.floor(
              (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div key={index} className="flex flex-col items-center">
                <div
                  className={`
                    z-10 flex h-12 w-12 items-center justify-center rounded-full
                    ${
                      isPast
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary text-primary-foreground'
                    }
                  `}
                >
                  {format(date, 'd')}
                </div>
                <div className="mt-1 text-center">
                  <p className="text-xs font-medium">{format(date, 'MMM yyyy')}</p>
                  <p className="text-xs text-muted-foreground">
                    {daysPassed > 0
                      ? t('dashboard.calendar.daysUntilPayment', { days: daysPassed })
                      : t('dashboard.calendar.daysPastPayment', { days: Math.abs(daysPassed) })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <CreditCard className="mr-2 h-5 w-5 text-primary" />
          {t('dashboard.paymentSchedule.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value: string) => setActiveTab(value as PaymentFrequency)}
        >
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="MONTHLY">{t('dashboard.calendar.frequencies.monthly')}</TabsTrigger>
            <TabsTrigger value="QUARTERLY">
              {t('dashboard.calendar.frequencies.quarterly')}
            </TabsTrigger>
            <TabsTrigger value="ANNUAL">{t('dashboard.calendar.frequencies.annual')}</TabsTrigger>
            <TabsTrigger value="CUSTOM">{t('dashboard.calendar.frequencies.custom')}</TabsTrigger>
          </TabsList>

          {FREQUENCIES.map(freq => (
            <TabsContent key={freq.value} value={freq.value} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t('dashboard.paymentSchedule.frequency')}
                  </h3>
                  <p className="mt-1 text-2xl font-semibold">
                    {t(`dashboard.calendar.frequencies.${freq.value.toLowerCase()}`)}
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t('dashboard.paymentSchedule.amount')}
                  </h3>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatCurrency(getPaymentAmount(freq.value))}
                  </p>
                </div>
              </div>

              {/* Custom frequency settings */}
              {freq.value === 'CUSTOM' && (
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">
                      {t('dashboard.paymentSchedule.customSettings')}
                    </h3>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">
                      {t('dashboard.paymentSchedule.paymentDays')}
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {[1, 5, 10, 15, 20, 25].map(day => (
                        <button
                          key={day}
                          onClick={() => {
                            if (customDays.includes(day)) {
                              setCustomDays(customDays.filter(d => d !== day));
                            } else {
                              setCustomDays([...customDays, day].sort((a, b) => a - b));
                            }
                          }}
                          className={`
                            text-xs px-2 py-1 rounded-full
                            ${
                              customDays.includes(day)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }
                          `}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Timeline */}
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">
                    {t('dashboard.paymentSchedule.nextPayments')}
                  </h3>
                </div>

                {renderPaymentTimeline()}
              </div>

              {/* Payment Schedule Details */}
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-medium mb-3">
                  {t('dashboard.paymentSchedule.upcomingDates')}
                </h3>

                <div className="space-y-2 text-sm">
                  {paymentDates.slice(0, 6).map((date, index) => (
                    <div
                      key={index}
                      className="flex justify-between pb-2 border-b border-border last:border-none"
                    >
                      <span>{format(date, 'EEEE, MMM d, yyyy')}</span>
                      <span className="font-medium">
                        {formatCurrency(getPaymentAmount(freq.value))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
