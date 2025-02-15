import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { PaymentStatus, PaymentMethod } from "@prisma/client";
import { mapStripeStatusToPaymentStatus } from "@/lib/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return NextResponse.json(
        { error: "Webhook secret is not configured" },
        { status: 500 }
      );
    }

    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("⚠️ Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log(`🔔 Webhook received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;

        if (!orderId) {
          console.error("Missing orderId in session metadata");
          return NextResponse.json(
            { error: "Missing orderId" },
            { status: 400 }
          );
        }

        console.log(`💰 Payment successful for order ${orderId}`);

        // Update payment status
        await db.payment.update({
          where: { id: orderId },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            method: PaymentMethod.STRIPE,
          },
        });

        break;
      }

      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (!orderId) {
          console.error("Missing orderId in payment intent metadata");
          return NextResponse.json(
            { error: "Missing orderId" },
            { status: 400 }
          );
        }

        console.log(`💳 Payment intent ${paymentIntent.status} for order ${orderId}`);

        // Get payment details
        const payment = await db.payment.findUnique({
          where: { id: orderId },
        });

        if (!payment) {
          console.error("Payment not found:", orderId);
          return NextResponse.json(
            { error: "Payment not found" },
            { status: 404 }
          );
        }

        // Map Stripe status to our PaymentStatus
        const newStatus = mapStripeStatusToPaymentStatus(paymentIntent.status);
        const paidAt = newStatus === PaymentStatus.PAID ? new Date() : null;

        // Update payment status
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: newStatus,
            paidAt,
            method: PaymentMethod.STRIPE,
          },
        });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 