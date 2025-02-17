import { sendInvoiceEmail } from './email';
import { formatCurrency } from './utils/shared';

interface NotificationProps {
  tenant: {
    id: string;
    name: string;
    email: string;
    phone: string;
    room: {
      number: string;
      property: {
        name: string;
      };
    };
  };
  billing: {
    id: string;
    amount: number;
    dueDate: Date;
  };
}

interface EmailProps extends NotificationProps {
  to: string;
}

interface WhatsAppProps extends NotificationProps {
  phone: string;
}

export async function sendBillingEmail({ to, tenant, billing }: EmailProps) {
  try {
    await sendInvoiceEmail({
      email: to,
      tenantName: tenant.name,
      propertyName: tenant.room.property.name,
      roomNumber: tenant.room.number,
      amount: billing.amount,
      dueDate: billing.dueDate,
      invoiceNumber: `INV-${billing.id}`,
      paymentType: 'Rent',
    });
  } catch (error) {
    console.error('Failed to send billing email:', error);
    throw error;
  }
}

export async function sendBillingWhatsApp({ phone, tenant, billing }: WhatsAppProps) {
  // TODO: Implement actual WhatsApp sending logic
  console.log(`Sending billing WhatsApp to ${phone}`);
  console.log(`Tenant: ${tenant.name}`);
  console.log(`Amount: ${formatCurrency(billing.amount)}`);
  console.log(`Due Date: ${billing.dueDate}`);
}

export async function sendPaymentReminderEmail({ to, tenant, billing }: EmailProps) {
  try {
    await sendInvoiceEmail({
      email: to,
      tenantName: tenant.name,
      propertyName: tenant.room.property.name,
      roomNumber: tenant.room.number,
      amount: billing.amount,
      dueDate: billing.dueDate,
      invoiceNumber: `INV-${billing.id}`,
      paymentType: 'Rent',
    });
  } catch (error) {
    console.error('Failed to send payment reminder email:', error);
    throw error;
  }
}

export async function sendPaymentReminderWhatsApp({ phone, tenant, billing }: WhatsAppProps) {
  // TODO: Implement actual WhatsApp sending logic
  console.log(`Sending payment reminder WhatsApp to ${phone}`);
  console.log(`Tenant: ${tenant.name}`);
  console.log(`Amount: ${formatCurrency(billing.amount)}`);
  console.log(`Due Date: ${billing.dueDate}`);
}
