/*
  Warnings:

  - The values [BIANNUALLY,ANNUALLY,BI_WEEKLY,SEMI_ANNUAL] on the enum `PaymentFrequency` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentFrequency_new" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'CUSTOM');
ALTER TABLE "Lease" ALTER COLUMN "paymentFrequency" DROP DEFAULT;
ALTER TABLE "Property" ALTER COLUMN "paymentFrequency" DROP DEFAULT;
ALTER TABLE "Property" ALTER COLUMN "paymentFrequency" TYPE "PaymentFrequency_new" USING ("paymentFrequency"::text::"PaymentFrequency_new");
ALTER TABLE "Lease" ALTER COLUMN "paymentFrequency" TYPE "PaymentFrequency_new" USING ("paymentFrequency"::text::"PaymentFrequency_new");
ALTER TYPE "PaymentFrequency" RENAME TO "PaymentFrequency_old";
ALTER TYPE "PaymentFrequency_new" RENAME TO "PaymentFrequency";
DROP TYPE "PaymentFrequency_old";
ALTER TABLE "Lease" ALTER COLUMN "paymentFrequency" SET DEFAULT 'MONTHLY';
ALTER TABLE "Property" ALTER COLUMN "paymentFrequency" SET DEFAULT 'MONTHLY';
COMMIT;

-- CreateTable
CREATE TABLE "RoomPriceTier" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomPriceTier_roomId_idx" ON "RoomPriceTier"("roomId");

-- AddForeignKey
ALTER TABLE "RoomPriceTier" ADD CONSTRAINT "RoomPriceTier_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
