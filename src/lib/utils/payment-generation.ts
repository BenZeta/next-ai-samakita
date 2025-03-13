import {
  PaymentFrequency,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  Property,
  Room,
  Tenant,
} from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { db } from '../db';
import { sendInvoiceEmail } from '../email';
import { createPaymentIntent } from '../stripe';
import {
  adjustAmountForFrequency,
  calculateNextPaymentDate,
  calculateProRatedAmount,
} from './payment-calculations';

interface GeneratePaymentOptions {
  tenant: Tenant & {
    room: Room & {
      property: Property;
    };
  };
  paymentMethod: PaymentMethod;
  isProRated?: boolean;
  startDate?: Date;
  endDate?: Date;
}

interface BatchPaymentGenerationOptions {
  propertyGroupId?: string;
  propertyId?: string;
  paymentMethod: PaymentMethod;
  userId: string;
}

export async function generatePayment({
  tenant,
  paymentMethod,
  isProRated = false,
  startDate,
  endDate,
}: GeneratePaymentOptions) {
  const property = tenant.room.property;
  const now = new Date();

  // Calculate the base amount
  const baseAmount = tenant.rentAmount || tenant.room.price;

  // Calculate the billing cycle dates
  const billingCycleStart = startDate || now;
  const nextBillingDate = calculateNextPaymentDate(
    billingCycleStart,
    property.paymentFrequency,
    property.customPaymentDays
  );
  const billingCycleEnd = endDate || nextBillingDate;

  // Calculate the amount based on whether it's pro-rated
  const amount = isProRated
    ? calculateProRatedAmount(
        baseAmount,
        billingCycleStart,
        billingCycleEnd,
        property.paymentFrequency
      )
    : adjustAmountForFrequency(baseAmount, property.paymentFrequency);

  // Calculate due date based on property settings
  const dueDate = new Date(billingCycleStart);
  dueDate.setDate(dueDate.getDate() + property.dueDateOffset);

  // Create payment
  const payment = await db.payment.create({
    data: {
      amount,
      type: PaymentType.RENT,
      status: PaymentStatus.PENDING,
      method: paymentMethod,
      dueDate,
      billingCycleStart,
      billingCycleEnd,
      tenantId: tenant.id,
      propertyId: property.id,
    },
  });

  // Generate Stripe payment link if needed
  let paymentLink: string | undefined;
  if (paymentMethod === PaymentMethod.STRIPE) {
    if (!tenant.email) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Tenant email is required for Stripe payments',
      });
    }

    const stripeResponse = await createPaymentIntent({
      orderId: payment.id,
      amount: payment.amount,
      customerEmail: tenant.email,
      customerName: tenant.name,
      description: `${payment.type} payment for ${property.name} - Room ${tenant.room.number}`,
    });

    await db.payment.update({
      where: { id: payment.id },
      data: {
        stripePaymentId: stripeResponse.paymentIntentId,
        stripeClientSecret: stripeResponse.clientSecret || undefined,
      },
    });

    // Create the Stripe Checkout URL
    paymentLink = `https://checkout.stripe.com/pay/${stripeResponse.paymentIntentId}`;
  }

  // Send invoice email
  await sendInvoiceEmail({
    email: tenant.email,
    tenantName: tenant.name,
    propertyName: property.name,
    roomNumber: tenant.room.number,
    amount: payment.amount,
    dueDate: payment.dueDate,
    paymentLink,
    paymentType: payment.type,
    invoiceNumber: `INV-${payment.id}`,
  });

  return payment;
}

export async function generateBatchPayments({
  propertyGroupId,
  propertyId,
  paymentMethod,
  userId,
}: BatchPaymentGenerationOptions) {
  // Get all active tenants for the specified properties
  const tenants = await db.tenant.findMany({
    where: {
      status: 'ACTIVE',
      room: {
        property: {
          userId,
          ...(propertyId ? { id: propertyId } : {}),
          ...(propertyGroupId ? { propertyGroupId } : {}),
        },
      },
    },
    include: {
      room: {
        include: {
          property: true,
        },
      },
    },
  });

  const payments = [];
  const errors = [];

  // Generate payments for each tenant
  for (const tenant of tenants) {
    try {
      const payment = await generatePayment({
        tenant,
        paymentMethod,
      });
      payments.push(payment);
    } catch (error) {
      errors.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    payments,
    errors,
    totalGenerated: payments.length,
    totalFailed: errors.length,
  };
}

/**
 * Generate all payment records for a lease period
 * This function creates payment records for the entire lease duration
 */
export async function generateLeasePayments({
  tenant,
  startDate,
  endDate,
  rentAmount,
  paymentFrequency,
  propertyId,
  firstPaymentPaid = false,
  customPaymentDays,
  dueDateOffset,
  transaction,
}: {
  tenant: { id: string; name: string; email: string };
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  paymentFrequency: PaymentFrequency;
  propertyId: string;
  firstPaymentPaid?: boolean;
  customPaymentDays?: number[];
  dueDateOffset: number;
  transaction?: any; // Transaction object from Prisma
}) {
  const payments = [];
  const now = new Date();

  // Generate payment periods based on frequency
  const { generatePaymentPeriods } = await import('./payment-calculations');

  const periods = generatePaymentPeriods(
    startDate,
    endDate,
    rentAmount,
    paymentFrequency,
    customPaymentDays
  );

  // Use the provided transaction object or fallback to direct db
  const dbClient = transaction || db;

  // Create a payment record for each period
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const isFirstPayment = i === 0;

    // Calculate due date
    let dueDate: Date;

    if (isFirstPayment) {
      // First payment is due immediately
      dueDate = new Date(now);
    } else {
      // For all recurring payments, we should use the property's due date setting
      // Get the month and year from the period start
      const periodMonth = period.startDate.getMonth();
      const periodYear = period.startDate.getFullYear();

      // Create the due date using the property's dueDateOffset (e.g., 5th of the month)
      dueDate = new Date(periodYear, periodMonth, dueDateOffset);

      // If the due date falls before the period start, move to the next month
      // This can happen when tenant moves in after the due date (e.g., moves in on 13th, due date is 5th)
      if (dueDate.getTime() < period.startDate.getTime()) {
        dueDate = new Date(periodYear, periodMonth + 1, dueDateOffset);
      }

      // Ensure we don't create past due payments for immediate future periods
      if (dueDate.getTime() < now.getTime()) {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Only adjust the very next payment if it would be overdue
        if (periodMonth === currentMonth && periodYear === currentYear) {
          dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() + 3); // Give a few days buffer
        }
      }
    }

    const payment = await dbClient.payment.create({
      data: {
        tenantId: tenant.id,
        propertyId: propertyId,
        amount: period.amount,
        type: 'RENT',
        status: isFirstPayment && firstPaymentPaid ? 'PAID' : 'PENDING',
        dueDate: dueDate,
        billingCycleStart: period.startDate,
        billingCycleEnd: period.endDate,
        ...(isFirstPayment && firstPaymentPaid ? { paidAt: now } : {}),
      },
    });

    payments.push(payment);
  }

  return payments;
}
