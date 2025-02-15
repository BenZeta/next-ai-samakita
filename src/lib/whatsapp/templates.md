# WhatsApp Message Templates

These templates need to be created in the WhatsApp Business Platform before they can be used in the application.

## payment_reminder

**Language**: Indonesian (id)
**Category**: PAYMENT_UPDATE
**Template**:
```
Halo {{1}},

Ini adalah pengingat pembayaran sewa kamar Anda sebesar {{2}} yang jatuh tempo pada {{3}}.

Silakan lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari denda keterlambatan.

Terima kasih.
```

## payment_confirmation

**Language**: Indonesian (id)
**Category**: PAYMENT_UPDATE
**Template**:
```
Halo {{1}},

Pembayaran sewa kamar Anda sebesar {{2}} telah kami terima pada {{3}}.

Terima kasih atas pembayaran tepat waktu Anda.
```

## payment_overdue

**Language**: Indonesian (id)
**Category**: PAYMENT_UPDATE
**Template**:
```
Halo {{1}},

Pembayaran sewa kamar Anda sebesar {{2}} telah melewati jatuh tempo pada {{3}}.

Mohon segera lakukan pembayaran untuk menghindari penalti lebih lanjut.

Terima kasih.
```

## How to Create Templates

1. Go to WhatsApp Business Platform
2. Navigate to Message Templates
3. Click "Create Template"
4. Select category "PAYMENT_UPDATE"
5. Add template name and language
6. Copy and paste the template text
7. Add sample values for variables
8. Submit for approval

## Variables

1. {{1}} - Tenant name
2. {{2}} - Payment amount (formatted with currency)
3. {{3}} - Due date or payment date (formatted) 