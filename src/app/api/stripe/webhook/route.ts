import { db } from '@/lib/db';
import { BillingStatus, PaymentStatus } from '@prisma/client';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Check if Stripe is configured
const isStripeConfigured = process.env.STRIPE_API_SB_KEY && process.env.STRIPE_WEBHOOK_SECRET;

// Only initialize Stripe if keys are available
const stripe = isStripeConfigured
  ? new Stripe(process.env.STRIPE_API_SB_KEY!, {
      apiVersion: '2025-01-27.acacia', // Using a stable version instead of future date
    })
  : null;

export async function POST(req: Request) {
  // Return early if Stripe is not configured
  if (!isStripeConfigured || !stripe) {
    console.log('Stripe is not configured - webhook endpoint inactive');
    return NextResponse.json({ message: 'Stripe is not configured' }, { status: 503 });
  }

  const body = await req.text();
  const signature = headers().get('stripe-signature');

  // Return early if signature is missing
  if (!signature) {
    return NextResponse.json({ error: 'Stripe signature missing' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const error = err as Error;
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Find payment by Stripe payment ID
        const payment = await db.payment.findFirst({
          where: {
            stripePaymentId: paymentIntent.id,
          },
        });

        if (!payment) {
          console.error('Payment not found for Stripe payment intent:', paymentIntent.id);
          return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        // Update payment status
        await db.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
          },
        });

        // Update billing status if all payments are paid
        if (payment.billingId) {
          const billing = await db.billing.findUnique({
            where: { id: payment.billingId },
            include: {
              payments: true,
            },
          });

          if (billing && billing.payments.every(p => p.status === PaymentStatus.PAID)) {
            await db.billing.update({
              where: { id: payment.billingId },
              data: {
                status: BillingStatus.SENT,
              },
            });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Find payment by Stripe payment ID
        const payment = await db.payment.findFirst({
          where: {
            stripePaymentId: paymentIntent.id,
          },
        });

        if (!payment) {
          console.error('Payment not found for Stripe payment intent:', paymentIntent.id);
          return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        // Update payment status
        await db.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.FAILED,
          },
        });
        break;
      }

      default: {
        console.log(`Unhandled event type: ${event.type}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
