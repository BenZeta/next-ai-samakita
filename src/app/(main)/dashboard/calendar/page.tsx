'use client';

import { PaymentScheduleVisualizer } from '@/components/dashboard/PaymentScheduleVisualizer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/trpc/react';
import { PaymentFrequency } from '@prisma/client';
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  startOfMonth,
  startOfToday,
} from 'date-fns';
import { ArrowLeft, ArrowRight, Filter } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'use-intl';

type FrequencyFilter = PaymentFrequency | 'ALL';

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};

export default function PaymentCalendarPage() {
  const t = useTranslations();
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('ALL');
  const [propertyFilter, setPropertyFilter] = useState<string>('');

  // Get the first day and last day of the current month
  const firstDayOfMonth = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const lastDayOfMonth = useMemo(() => endOfMonth(selectedDate), [selectedDate]);

  // Get all days in the current month
  const daysInMonth = useMemo(
    () => eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth }),
    [firstDayOfMonth, lastDayOfMonth]
  );

  // Calculate calendar grid cells (including days from prev/next month to fill the grid)
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = getDay(firstDayOfMonth);
    const totalDays = daysInMonth.length;
    const totalCells = Math.ceil((totalDays + firstDayOfWeek) / 7) * 7;

    // Create array of calendar cells
    return Array.from({ length: totalCells }).map((_, index) => {
      const dayIndex = index - firstDayOfWeek;
      if (dayIndex < 0 || dayIndex >= totalDays) {
        return { date: null, isCurrentMonth: false };
      }
      return { date: daysInMonth[dayIndex], isCurrentMonth: true };
    });
  }, [daysInMonth, firstDayOfMonth]);

  // Fetch properties for filtering
  const { data: propertiesData } = api.property.list.useQuery({
    limit: 100,
  });
  const properties = propertiesData?.properties || [];

  // Fetch all payments due in the selected month
  const { data: paymentsData, isLoading: isLoadingPayments } = api.payment.list.useQuery(
    {
      page: 1,
      limit: 100,
      startDate: firstDayOfMonth,
      endDate: lastDayOfMonth,
      propertyId: propertyFilter || undefined,
    },
    {
      keepPreviousData: true,
    }
  );

  // Get payment frequency info from properties
  const { data: propertyPaymentFrequencies } = api.property.list.useQuery(
    {
      limit: 100,
    },
    {
      select: data => {
        return data.properties.map(property => ({
          id: property.id,
          name: property.name,
          paymentFrequency: property.paymentFrequency,
          customPaymentDays: property.customPaymentDays,
        }));
      },
    }
  );

  // Filter payments by frequency if a filter is applied
  const filteredPayments = useMemo(() => {
    if (!paymentsData?.payments) return [];

    if (frequencyFilter === 'ALL') {
      return paymentsData.payments;
    }

    // Match payments to properties and filter by frequency
    return paymentsData.payments.filter(payment => {
      const property = propertyPaymentFrequencies?.find(p => p.id === payment.propertyId);
      return property?.paymentFrequency === frequencyFilter;
    });
  }, [paymentsData?.payments, frequencyFilter, propertyPaymentFrequencies]);

  // Group payments by date for the calendar view
  const paymentsByDate = useMemo(() => {
    const result = new Map<string, typeof filteredPayments>();

    filteredPayments.forEach(payment => {
      const dateKey = format(new Date(payment.dueDate), 'yyyy-MM-dd');
      if (!result.has(dateKey)) {
        result.set(dateKey, []);
      }
      result.get(dateKey)?.push(payment);
    });

    return result;
  }, [filteredPayments]);

  // Navigate to previous month
  const goToPreviousMonth = useCallback(() => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  // Go to today
  const goToToday = useCallback(() => {
    setSelectedDate(startOfToday());
  }, []);

  // Render payments for a specific date
  const renderPaymentsForDate = useCallback(
    (date: Date | null) => {
      if (!date) return null;

      const dateKey = format(date, 'yyyy-MM-dd');
      const paymentsForDate = paymentsByDate.get(dateKey) || [];

      if (paymentsForDate.length === 0) return null;

      return (
        <div className="mt-1 space-y-1">
          {paymentsForDate.map(payment => (
            <div
              key={payment.id}
              className={`
              text-xs px-1 py-0.5 rounded truncate
              ${
                payment.status === 'PAID'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500'
                  : payment.status === 'OVERDUE'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500'
              }
            `}
              title={`${payment.tenant.name} - ${formatCurrency(payment.amount)}`}
            >
              {payment.tenant.name.split(' ')[0]} - {formatCurrency(payment.amount)}
            </div>
          ))}
        </div>
      );
    },
    [paymentsByDate]
  );

  return (
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
          {t('dashboard.calendar.title')}
        </h1>

        <div className="flex space-x-2">
          <Button onClick={goToToday} variant="outline" size="sm">
            {t('dashboard.calendar.today')}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {/* Filters Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              {t('dashboard.calendar.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Property Filter */}
            <div>
              <label htmlFor="property-filter" className="block text-sm font-medium mb-1">
                {t('dashboard.calendar.filterByProperty')}
              </label>
              <select
                id="property-filter"
                value={propertyFilter}
                onChange={e => setPropertyFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2"
              >
                <option value="">{t('dashboard.calendar.allProperties')}</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency Filter */}
            <div>
              <label htmlFor="frequency-filter" className="block text-sm font-medium mb-1">
                {t('dashboard.calendar.filterByFrequency')}
              </label>
              <select
                id="frequency-filter"
                value={frequencyFilter}
                onChange={e => setFrequencyFilter(e.target.value as FrequencyFilter)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2"
              >
                <option value="ALL">{t('dashboard.calendar.allFrequencies')}</option>
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

            {/* Status Summary */}
            <div className="pt-4 border-t border-border">
              <h3 className="font-medium mb-2">{t('dashboard.calendar.summary')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('dashboard.calendar.totalPayments')}</span>
                  <span className="font-medium">{filteredPayments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.calendar.pendingPayments')}</span>
                  <span className="font-medium">
                    {filteredPayments.filter(p => p.status === 'PENDING').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.calendar.paidPayments')}</span>
                  <span className="font-medium">
                    {filteredPayments.filter(p => p.status === 'PAID').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.calendar.overduePayments')}</span>
                  <span className="font-medium">
                    {filteredPayments.filter(p => p.status === 'OVERDUE').length}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Card */}
        <Card className="md:col-span-3">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{format(selectedDate, 'MMMM yyyy')}</h2>
              <div className="flex space-x-1">
                <Button onClick={goToPreviousMonth} size="icon" variant="ghost">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button onClick={goToNextMonth} size="icon" variant="ghost">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="mt-4 grid grid-cols-7 gap-1">
              {/* Week days header */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-medium text-sm py-1">
                  {day}
                </div>
              ))}

              {/* Calendar cells */}
              {calendarDays.map((cell, i) => {
                const isToday = cell.date ? isSameDay(cell.date, new Date()) : false;

                return (
                  <div
                    key={i}
                    className={`
                      border rounded-md p-1 min-h-[80px]
                      ${!cell.isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : ''}
                      ${isToday ? 'border-primary' : 'border-border'}
                    `}
                  >
                    {cell.date && (
                      <>
                        <div className="text-right">
                          <span
                            className={`
                              text-sm inline-flex h-6 w-6 items-center justify-center rounded-full
                              ${isToday ? 'bg-primary text-primary-foreground' : ''}
                            `}
                          >
                            {format(cell.date, 'd')}
                          </span>
                        </div>
                        {renderPaymentsForDate(cell.date)}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Schedule Visualizer */}
      <div className="mb-6">
        <PaymentScheduleVisualizer propertyId={propertyFilter || undefined} />
      </div>
    </div>
  );
}
