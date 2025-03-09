/*
  Warnings:

  - You are about to drop the column `dueDate` on the `Property` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "billingCycleEnd" TIMESTAMP(3),
ADD COLUMN     "billingCycleStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "dueDate",
ADD COLUMN     "dueDateOffset" INTEGER NOT NULL DEFAULT 5;

-- CreateIndex
CREATE INDEX "Payment_billingCycleStart_idx" ON "Payment"("billingCycleStart");

-- CreateIndex
CREATE INDEX "Payment_billingCycleEnd_idx" ON "Payment"("billingCycleEnd");
