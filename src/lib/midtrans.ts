import { Payment } from "@prisma/client";

const SANDBOX_SERVER_KEY = process.env.MIDTRANS_SERVER_SB_KEY!;
const SANDBOX_CLIENT_KEY = process.env.MIDTRANS_CLIENT_SB_KEY!;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

interface MidtransConfig {
  clientKey: string;
  serverKey: string;
  merchantId: string;
  isProduction: boolean;
}

interface MidtransPaymentResponse {
  token: string;
  redirect_url: string;
  transaction_id: string;
  transaction_status?: string;
}

interface MidtransPaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
}

const config: MidtransConfig = {
  clientKey: IS_PRODUCTION ? process.env.MIDTRANS_CLIENT_KEY! : SANDBOX_CLIENT_KEY,
  serverKey: IS_PRODUCTION ? process.env.MIDTRANS_SERVER_KEY! : SANDBOX_SERVER_KEY,
  merchantId: process.env.MIDTRANS_MERCHANT_ID!,
  isProduction: IS_PRODUCTION,
};

export async function createMidtransPayment(payment: MidtransPaymentRequest): Promise<MidtransPaymentResponse> {
  const apiUrl = config.isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(config.serverKey + ":").toString("base64")}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: payment.orderId,
        gross_amount: payment.amount,
      },
      customer_details: {
        first_name: payment.customerName,
        email: payment.customerEmail,
      },
      credit_card: {
        secure: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create Midtrans payment");
  }

  const data = await response.json();
  return {
    token: data.token,
    redirect_url: data.redirect_url,
    transaction_id: payment.orderId,
    transaction_status: data.transaction_status,
  };
}

interface MidtransStatusResponse {
  transaction_status: string;
  order_id: string;
  payment_type: string;
  transaction_time: string;
}

export async function checkMidtransPaymentStatus(orderId: string): Promise<MidtransStatusResponse> {
  const apiUrl = config.isProduction
    ? `https://api.midtrans.com/v2/${orderId}/status`
    : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(config.serverKey + ":").toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to check Midtrans payment status");
  }

  return response.json();
}

export async function cancelMidtransPayment(orderId: string): Promise<void> {
  const apiUrl = config.isProduction
    ? `https://api.midtrans.com/v2/${orderId}/cancel`
    : `https://api.sandbox.midtrans.com/v2/${orderId}/cancel`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(config.serverKey + ":").toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to cancel Midtrans payment");
  }
} 