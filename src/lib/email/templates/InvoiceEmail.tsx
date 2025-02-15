import React from 'react';
import { format } from 'date-fns';

interface InvoiceEmailProps {
  tenantName: string;
  propertyName: string;
  roomNumber: string;
  amount: number;
  dueDate: Date;
  invoiceNumber: string;
  paymentLink?: string;
}

export function InvoiceEmail({ 
  tenantName, 
  propertyName, 
  roomNumber, 
  amount, 
  dueDate, 
  invoiceNumber,
  paymentLink 
}: InvoiceEmailProps) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
      <div style={{ textAlign: 'right', marginBottom: '24px', color: '#6B7280', fontSize: '14px' }}>
        {format(new Date(), 'dd MMMM yyyy')}
      </div>

      <h1 style={{ 
        color: '#1F2937', 
        fontSize: '24px', 
        marginBottom: '24px',
        textAlign: 'center',
        borderBottom: '2px solid #E5E7EB',
        paddingBottom: '16px'
      }}>
        Payment Invoice
      </h1>
      
      <div style={{ marginBottom: '32px' }}>
        <p style={{ color: '#4B5563', fontSize: '16px', marginBottom: '16px' }}>
          Dear {tenantName},
        </p>
        
        <p style={{ color: '#4B5563', fontSize: '16px', marginBottom: '16px' }}>
          I hope this email finds you well. This is a payment invoice for your room rental at {propertyName}.
        </p>
      </div>
      
      <div style={{ 
        marginBottom: '32px', 
        padding: '24px', 
        border: '1px solid #E5E7EB', 
        borderRadius: '8px',
        backgroundColor: '#F9FAFB'
      }}>
        <h2 style={{ color: '#1F2937', fontSize: '18px', marginBottom: '16px' }}>
          Invoice Details #{invoiceNumber}
        </h2>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '12px 0', color: '#6B7280', width: '40%' }}>Property:</td>
              <td style={{ padding: '12px 0', color: '#1F2937', fontWeight: 500 }}>{propertyName}</td>
            </tr>
            <tr>
              <td style={{ padding: '12px 0', color: '#6B7280' }}>Room Number:</td>
              <td style={{ padding: '12px 0', color: '#1F2937', fontWeight: 500 }}>{roomNumber}</td>
            </tr>
            <tr>
              <td style={{ padding: '12px 0', color: '#6B7280' }}>Amount Due:</td>
              <td style={{ padding: '12px 0', color: '#1F2937', fontWeight: 'bold' }}>
                Rp {amount.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '12px 0', color: '#6B7280' }}>Due Date:</td>
              <td style={{ padding: '12px 0', color: '#1F2937', fontWeight: 500 }}>
                {format(dueDate, 'dd MMMM yyyy')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {paymentLink && (
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <p style={{ color: '#4B5563', fontSize: '16px', marginBottom: '16px' }}>
            To make your payment, please click the secure payment button below:
          </p>
          <a
            href={paymentLink}
            style={{
              display: 'inline-block',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              padding: '16px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '16px',
              marginBottom: '16px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Pay Now Securely
          </a>
        </div>
      )}
      
      <div style={{ 
        marginTop: '32px', 
        borderTop: '1px solid #E5E7EB', 
        paddingTop: '24px',
        backgroundColor: '#F9FAFB',
        padding: '24px',
        borderRadius: '8px'
      }}>
        <h3 style={{ color: '#1F2937', fontSize: '16px', marginBottom: '16px', fontWeight: 600 }}>
          Important Notes:
        </h3>
        <ul style={{ 
          color: '#6B7280', 
          fontSize: '14px', 
          paddingLeft: '20px', 
          marginBottom: '16px',
          lineHeight: '1.6'
        }}>
          <li>Please ensure payment is made by {format(dueDate, 'dd MMMM yyyy')}</li>
          <li>The payment link is valid for 24 hours from the time of this email</li>
          <li>For any payment-related inquiries, please contact the property management</li>
        </ul>
      </div>
      
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <p style={{ color: '#6B7280', fontSize: '14px', fontStyle: 'italic' }}>
          This is an automated email. Please do not reply to this message.
        </p>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '8px' }}>
          {propertyName}
        </p>
      </div>
    </div>
  );
} 