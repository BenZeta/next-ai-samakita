import { PaymentFrequency } from '@prisma/client';

interface PaymentPeriod {
  startDate: Date;
  endDate: Date;
  amount: number;
}

/**
 * Calculate the next payment date based on the current date and payment frequency
 */
export function calculateNextPaymentDate(
  currentDate: Date,
  frequency: PaymentFrequency,
  customPaymentDays?: number[]
): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'DAILY':
      nextDate.setDate(currentDate.getDate() + 1);
      break;
    case 'WEEKLY':
      nextDate.setDate(currentDate.getDate() + 7);
      break;
    case 'BI_WEEKLY':
      nextDate.setDate(currentDate.getDate() + 14);
      break;
    case 'MONTHLY':
      nextDate.setMonth(currentDate.getMonth() + 1);
      break;
    case 'QUARTERLY':
      nextDate.setMonth(currentDate.getMonth() + 3);
      break;
    case 'SEMI_ANNUAL':
      nextDate.setMonth(currentDate.getMonth() + 6);
      break;
    case 'ANNUAL':
      nextDate.setFullYear(currentDate.getFullYear() + 1);
      break;
    case 'CUSTOM':
      if (!customPaymentDays?.length) {
        throw new Error('Custom payment days must be provided for CUSTOM frequency');
      }
      // Find the next payment day
      const currentDay = currentDate.getDate();
      const nextDay = customPaymentDays.find(day => day > currentDay);

      if (nextDay) {
        // Next payment day is in the current month
        nextDate.setDate(nextDay);
      } else {
        // Next payment day is in the next month
        nextDate.setMonth(currentDate.getMonth() + 1);
        nextDate.setDate(Math.min(...customPaymentDays));
      }
      break;
  }

  return nextDate;
}

/**
 * Calculate pro-rated amount for a partial period
 */
export function calculateProRatedAmount(
  baseAmount: number,
  startDate: Date,
  endDate: Date,
  frequency: PaymentFrequency
): number {
  const totalDays = getDaysInPeriod(startDate, frequency);
  const actualDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return (baseAmount * actualDays) / totalDays;
}

/**
 * Get the number of days in a payment period based on frequency
 */
function getDaysInPeriod(startDate: Date, frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'DAILY':
      return 1;
    case 'WEEKLY':
      return 7;
    case 'BI_WEEKLY':
      return 14;
    case 'MONTHLY':
      return getDaysInMonth(startDate);
    case 'QUARTERLY':
      return getDaysInQuarter(startDate);
    case 'SEMI_ANNUAL':
      return getDaysInSemiAnnual(startDate);
    case 'ANNUAL':
      return getDaysInYear(startDate.getFullYear());
    case 'CUSTOM':
      return getDaysInMonth(startDate); // For custom, we'll use monthly as base
    default:
      throw new Error('Invalid payment frequency');
  }
}

/**
 * Get days in a specific month
 */
function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Get days in a quarter
 */
function getDaysInQuarter(date: Date): number {
  let days = 0;
  const currentMonth = date.getMonth();
  const quarterStartMonth = Math.floor(currentMonth / 3) * 3;

  for (let i = 0; i < 3; i++) {
    days += new Date(date.getFullYear(), quarterStartMonth + i + 1, 0).getDate();
  }

  return days;
}

/**
 * Get days in a semi-annual period
 */
function getDaysInSemiAnnual(date: Date): number {
  let days = 0;
  const currentMonth = date.getMonth();
  const halfYearStartMonth = Math.floor(currentMonth / 6) * 6;

  for (let i = 0; i < 6; i++) {
    days += new Date(date.getFullYear(), halfYearStartMonth + i + 1, 0).getDate();
  }

  return days;
}

/**
 * Get days in a year
 */
function getDaysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 > 0) || year % 400 === 0 ? 366 : 365;
}

/**
 * Generate payment periods for a date range based on frequency
 */
export function generatePaymentPeriods(
  startDate: Date,
  endDate: Date,
  baseAmount: number,
  frequency: PaymentFrequency,
  customPaymentDays?: number[]
): PaymentPeriod[] {
  const periods: PaymentPeriod[] = [];
  let currentStart = new Date(startDate);

  while (currentStart < endDate) {
    const periodEnd = calculateNextPaymentDate(currentStart, frequency, customPaymentDays);
    const actualEnd = new Date(Math.min(periodEnd.getTime(), endDate.getTime()));

    periods.push({
      startDate: new Date(currentStart),
      endDate: actualEnd,
      amount: calculateProRatedAmount(baseAmount, currentStart, actualEnd, frequency),
    });

    currentStart = periodEnd;
  }

  return periods;
}

/**
 * Adjust payment amount based on the payment frequency
 */
export function adjustAmountForFrequency(
  monthlyAmount: number,
  frequency: PaymentFrequency
): number {
  switch (frequency) {
    case 'DAILY':
      return monthlyAmount / 30; // Approximate
    case 'WEEKLY':
      return (monthlyAmount * 12) / 52;
    case 'BI_WEEKLY':
      return (monthlyAmount * 12) / 26;
    case 'MONTHLY':
      return monthlyAmount;
    case 'QUARTERLY':
      return monthlyAmount * 3;
    case 'SEMI_ANNUAL':
      return monthlyAmount * 6;
    case 'ANNUAL':
      return monthlyAmount * 12;
    case 'CUSTOM':
      return monthlyAmount; // Base amount for custom frequency
    default:
      throw new Error('Invalid payment frequency');
  }
}
