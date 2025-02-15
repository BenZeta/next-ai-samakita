/*
  Warnings:

  - A unique constraint covering the columns `[midtransId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MANUAL', 'MIDTRANS');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'INVOICED';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "invoiceSentAt" TIMESTAMP(3),
ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "midtransId" TEXT,
ADD COLUMN     "receiptUrl" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "dueDate" INTEGER NOT NULL DEFAULT 5;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_midtransId_key" ON "Payment"("midtransId");
