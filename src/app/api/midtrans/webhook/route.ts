import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PaymentStatus, PaymentMethod } from "@prisma/client";
import { checkMidtransPaymentStatus } from "@/lib/midtrans";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, transaction_status, transaction_time } = body;

    if (!order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    // Get payment details
    const payment = await db.payment.findUnique({
      where: { id: order_id },
      include: {
        tenant: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Map Midtrans status to our PaymentStatus
    let newStatus = payment.status;
    let paidAt = payment.paidAt;

    switch (transaction_status) {
      case "capture":
      case "settlement":
        newStatus = PaymentStatus.PAID;
        paidAt = new Date(transaction_time || Date.now());
        break;
      case "pending":
        newStatus = PaymentStatus.PENDING;
        break;
      case "deny":
      case "cancel":
      case "expire":
        newStatus = PaymentStatus.CANCELLED;
        break;
      case "failure":
        newStatus = PaymentStatus.FAILED;
        break;
      default:
        newStatus = PaymentStatus.PENDING;
    }

    // Update payment status
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        paidAt,
        midtransStatus: transaction_status,
        method: PaymentMethod.MIDTRANS, // Ensure payment method is set to Midtrans
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Midtrans webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 