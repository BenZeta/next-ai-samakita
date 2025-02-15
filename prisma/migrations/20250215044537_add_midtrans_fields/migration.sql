-- Add Midtrans fields to Payment model
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "midtransId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "midtransToken" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "midtransStatus" TEXT;

-- Add FAILED to PaymentStatus enum if not exists
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'FAILED' AFTER 'CANCELLED'; 