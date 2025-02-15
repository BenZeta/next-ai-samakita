/*
  Warnings:

  - You are about to drop the column `invoiceNumber` on the `Payment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "invoiceNumber",
ADD COLUMN     "isRefunded" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "method" DROP NOT NULL,
ALTER COLUMN "method" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_propertyId_idx" ON "Payment"("propertyId");
