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
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <h1 style={{ color: '#1F2937', fontSize: '24px', marginBottom: '16px' }}>
        Invoice for Rent Payment - {propertyName}
      </h1>
      
      <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
        <h2 style={{ color: '#4B5563', fontSize: '18px', marginBottom: '12px' }}>
          Invoice #{invoiceNumber}
        </h2>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 0', color: '#6B7280' }}>Tenant Name:</td>
              <td style={{ padding: '8px 0', color: '#1F2937' }}>{tenantName}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', color: '#6B7280' }}>Room Number:</td>
              <td style={{ padding: '8px 0', color: '#1F2937' }}>{roomNumber}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', color: '#6B7280' }}>Amount Due:</td>
              <td style={{ padding: '8px 0', color: '#1F2937', fontWeight: 'bold' }}>
                Rp {amount.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', color: '#6B7280' }}>Due Date:</td>
              <td style={{ padding: '8px 0', color: '#1F2937' }}>
                {format(dueDate, 'dd MMMM yyyy')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {paymentLink && (
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <a
            href={paymentLink}
            style={{
              display: 'inline-block',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              marginBottom: '16px'
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Pay Now with Midtrans
          </a>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>
            Click the button above to pay securely through Midtrans
          </p>
        </div>
      )}
      
      <div style={{ marginTop: '24px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '8px' }}>
          Payment Methods:
        </p>
        <ul style={{ color: '#6B7280', fontSize: '14px', paddingLeft: '20px' }}>
          <li>Online payment through Midtrans (click button above)</li>
          <li>Manual bank transfer (please upload proof of payment)</li>
        </ul>
      </div>
      
      <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '24px' }}>
        If you have any questions, please contact the property management.
      </p>
    </div>
  );
} 