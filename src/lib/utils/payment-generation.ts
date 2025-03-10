import { PaymentMethod, PaymentStatus, PaymentType, Property, Room, Tenant } from '@prisma/client';
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
