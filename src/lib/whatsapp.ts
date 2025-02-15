import { Payment, Tenant } from "@prisma/client";

const WHATSAPP_API_URL = "https://graph.facebook.com/v17.0";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: "template" | "text";
  template?: {
    name: string;
    language: {
      code: string;
    };
    components: {
      type: string;
      parameters: any[];
    }[];
  };
  text?: {
    body: string;
  };
}

interface PaymentWithMidtrans extends Payment {
  midtransRedirectUrl?: string;
}

export async function sendWhatsAppMessage(to: string, message: WhatsAppMessage) {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send WhatsApp message");
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
}

export async function sendPaymentReminder(tenant: Tenant, payment: PaymentWithMidtrans) {
  // This is a placeholder function. In a real application, you would integrate with
  // a WhatsApp API provider like Twilio, MessageBird, or WhatsApp Business API.
  console.log(`Sending WhatsApp reminder to ${tenant.phone}:
Payment Type: ${payment.type}
Amount: Rp ${payment.amount.toLocaleString()}
Due Date: ${payment.dueDate.toLocaleDateString()}

Payment Methods:
1. Midtrans Payment Link (Credit Card, Bank Transfer, E-Wallet):
${payment.midtransRedirectUrl || "Not available"}

2. Manual Bank Transfer:
Bank: BCA
Account: 1234567890
Name: Property Owner Name

Please upload your proof of payment after making the transfer.`);
}

export async function sendPaymentConfirmation(tenant: Tenant, payment: Payment) {
  const message: WhatsAppMessage = {
    messaging_product: "whatsapp",
    to: tenant.phone.replace(/^0/, "62"),
    type: "template",
    template: {
      name: "payment_confirmation",
      language: {
        code: "id",
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: tenant.name,
            },
            {
              type: "text",
              text: `Rp ${payment.amount.toLocaleString()}`,
            },
            {
              type: "text",
              text: new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
          ],
        },
      ],
    },
  };

  return sendWhatsAppMessage(tenant.phone, message);
}

export async function sendPaymentOverdue(tenant: Tenant, payment: Payment) {
  const message: WhatsAppMessage = {
    messaging_product: "whatsapp",
    to: tenant.phone.replace(/^0/, "62"),
    type: "template",
    template: {
      name: "payment_overdue",
      language: {
        code: "id",
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: tenant.name,
            },
            {
              type: "text",
              text: `Rp ${payment.amount.toLocaleString()}`,
            },
            {
              type: "text",
              text: new Date(payment.dueDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
          ],
        },
      ],
    },
  };

  return sendWhatsAppMessage(tenant.phone, message);
} 