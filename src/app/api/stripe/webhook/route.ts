import { db } from '@/lib/db';
import { BillingStatus, PaymentStatus } from '@prisma/client';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_API_SB_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

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
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
