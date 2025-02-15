import { Resend } from 'resend';
import { createElement } from 'react';
import { ContractEmail } from './email/templates/ContractEmail';
import { InvoiceEmail } from './email/templates/InvoiceEmail';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@benzeta.shop',
    to: email,
    subject: "Verify your email address",
    html: `
      <div>
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
  });
}

export async function sendContractEmail(email: string, contractUrl: string, tenantName: string, propertyName: string, tenantId: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@benzeta.shop',
      to: email,
      subject: `Perjanjian Sewa Kos - ${propertyName}`,
      react: createElement(ContractEmail, {
        tenantName,
        propertyName,
        contractUrl,
        baseUrl,
        tenantId,
      }),
    });
  } catch (error) {
    console.error('Error sending contract email:', error);
    // Don't throw the error - we don't want to fail contract generation if email fails
  }
}

export async function sendInvoiceEmail({
  email,
  tenantName,
  propertyName,
  roomNumber,
  amount,
  dueDate,
  invoiceNumber,
  paymentLink,
  paymentType,
}: {
  email: string;
  tenantName: string;
  propertyName: string;
  roomNumber: string;
  amount: number;
  dueDate: Date;
  invoiceNumber: string;
  paymentLink?: string;
  paymentType: string;
}) {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@benzeta.shop',
      to: email,
      subject: `Invoice for ${paymentType} Payment - ${propertyName}`,
      react: createElement(InvoiceEmail, {
        tenantName,
        propertyName,
        roomNumber,
        amount,
        dueDate,
        invoiceNumber,
        paymentLink,
      }),
    });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    throw error;
  }
}

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@benzeta.shop',
      to,
      subject,
      html: html || text,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
