import React from 'react';

interface ContractEmailProps {
  tenantName: string;
  propertyName: string;
  contractUrl: string;
  baseUrl: string;
  tenantId: string;
}

export function ContractEmail({ tenantName, propertyName, contractUrl, baseUrl, tenantId }: ContractEmailProps) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <h1 style={{ color: '#1F2937', fontSize: '24px', marginBottom: '16px' }}>
        Perjanjian Sewa Kos - {propertyName}
      </h1>
      
      <p style={{ color: '#4B5563', fontSize: '16px', lineHeight: '24px', marginBottom: '16px' }}>
        Halo {tenantName},
      </p>
      
      <p style={{ color: '#4B5563', fontSize: '16px', lineHeight: '24px', marginBottom: '16px' }}>
        Terima kasih telah memilih {propertyName} sebagai tempat tinggal Anda. Kami telah menyiapkan perjanjian sewa kos untuk Anda.
      </p>
      
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: '#4B5563', fontSize: '16px', lineHeight: '24px', marginBottom: '16px' }}>
          Silakan unduh kontrak melalui link berikut:
        </p>
        <a 
          href={contractUrl}
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
          Unduh Kontrak
        </a>
      </div>
      
      <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '20px', marginBottom: '8px' }}>
        Catatan penting:
      </p>
      
      <ul style={{ color: '#6B7280', fontSize: '14px', lineHeight: '20px', marginBottom: '24px', paddingLeft: '20px' }}>
        <li>Link kontrak ini akan kedaluwarsa dalam 7 hari</li>
        <li>Harap cetak kontrak, tanda tangani, dan serahkan kepada pemilik kos</li>
        <li>Pastikan untuk membaca seluruh isi perjanjian dengan teliti</li>
        <li>Jika ada pertanyaan, silakan hubungi kami</li>
      </ul>
      
      <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '20px' }}>
        Email ini dibuat secara otomatis, mohon jangan membalas email ini.
      </p>
    </div>
  );
} 