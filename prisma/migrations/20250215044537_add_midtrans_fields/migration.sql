-- Add Midtrans fields to Payment model
ALTER TABLE "Payment" ADD COLUMN "midtransId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "midtransToken" TEXT;
ALTER TABLE "Payment" ADD COLUMN "midtransStatus" TEXT;

-- Add FAILED to PaymentStatus enum if not exists
ALTER TYPE "PaymentStatus" ADD VALUE 'FAILED' AFTER 'CANCELLED'; 