import { PaymentFrequency } from '@prisma/client';
import { adjustAmountForFrequency } from './payment-calculations';

export interface PriceTier {
  id: string;
  roomId: string;
  duration: number; // Duration in months (1, 3, 6, 12, etc.)
  price: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Find the most appropriate price tier based on lease duration
 * Returns the closest matching price tier, or the default tier
 */
export function findAppropriateRoomPriceTier(
  priceTiers: PriceTier[],
  leaseDuration: number
): PriceTier | null {
  if (!priceTiers.length) return null;

  // If we have an exact match for the lease duration
  const exactMatch = priceTiers.find(tier => tier.duration === leaseDuration);
  if (exactMatch) return exactMatch;

  // If no exact match, get the default tier
  const defaultTier = priceTiers.find(tier => tier.isDefault);
  if (defaultTier) return defaultTier;

  // If no default, get the closest tier (prefer longer durations)
  const sortedTiers = [...priceTiers].sort((a, b) => a.duration - b.duration);

  let closestTier = sortedTiers[0];
  for (const tier of sortedTiers) {
    if (tier.duration <= leaseDuration) {
      closestTier = tier;
    } else {
      break;
    }
  }

  return closestTier;
}

/**
 * Calculate the appropriate price based on price tier and payment frequency
 */
export function calculatePriceWithFrequency(
  basePriceTier: PriceTier | null,
  paymentFrequency: PaymentFrequency,
  leaseDuration: number
): number {
  if (!basePriceTier) return 0;

  // Calculate the monthly base price
  const monthlyPrice = basePriceTier.price / basePriceTier.duration;

  // Apply any discount for longer lease durations
  // This is based on any difference between the tier price and a linear calculation
  // e.g., if 6 months is cheaper than 6x the monthly rate, that discount is applied
  const discount = 1 - basePriceTier.price / (monthlyPrice * basePriceTier.duration);

  // Apply the discount to the current lease duration if it doesn't match the tier exactly
  const adjustedMonthlyPrice =
    leaseDuration === basePriceTier.duration ? monthlyPrice : monthlyPrice * (1 - discount);

  // Adjust for payment frequency (monthly → daily, weekly, etc.)
  return adjustAmountForFrequency(adjustedMonthlyPrice, paymentFrequency);
}

/**
 * Calculate the total price for a lease based on price tier and payment frequency
 */
export function calculateTotalLeasePrice(
  basePriceTier: PriceTier | null,
  leaseDuration: number
): number {
  if (!basePriceTier) return 0;

  // Calculate the monthly base price
  const monthlyPrice = basePriceTier.price / basePriceTier.duration;

  // Apply any discount for longer lease durations
  const discount = 1 - basePriceTier.price / (monthlyPrice * basePriceTier.duration);

  // Apply the discount to the current lease duration if it doesn't match the tier exactly
  const adjustedMonthlyPrice =
    leaseDuration === basePriceTier.duration ? monthlyPrice : monthlyPrice * (1 - discount);

  // Calculate total lease amount
  return adjustedMonthlyPrice * leaseDuration;
}
