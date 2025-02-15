import Stripe from 'stripe';
import { Payment } from '@prisma/client';

if (!process.env.STRIPE_API_SB_KEY) {
  throw new Error('Missing STRIPE_API_SB_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_API_SB_KEY, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
});

interface CreatePaymentIntentParams {
  amount: number;
  customerEmail: string;
  customerName: string;
  orderId: string;
  description: string;
}

export async function createPaymentIntent({
  amount,
  customerEmail,
  customerName,
  orderId,
  description,
}: CreatePaymentIntentParams) {
  try {
    // Create a customer first
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      metadata: {
        orderId,
      },
    });

    // Create a checkout session instead of a payment intent
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'idr',
            product_data: {
              name: description,
            },
            unit_amount: amount * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/api/stripe/success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/api/stripe/cancel`,
      metadata: {
        orderId,
      },
    });

    // Create a payment intent for status tracking
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'idr',
      customer: customer.id,
      metadata: {
        orderId,
      },
      description,
      payment_method_types: ['card'],
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      checkoutUrl: session.url,
    };
  } catch (error) {
    console.error('Error creating Stripe payment:', error);
    throw error;
  }
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error retrieving Stripe payment:', error);
    throw error;
  }
}

export async function cancelPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error canceling Stripe payment:', error);
    throw error;
  }
}

export function mapStripeStatusToPaymentStatus(stripeStatus: string): Payment['status'] {
  switch (stripeStatus) {
    case 'succeeded':
      return 'PAID';
    case 'processing':
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
      return 'PENDING';
    case 'canceled':
      return 'CANCELLED';
    case 'requires_capture':
      return 'PENDING';
    default:
      return 'FAILED';
  }
} 