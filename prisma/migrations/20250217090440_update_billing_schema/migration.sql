/*
  Warnings:

  - You are about to drop the column `propertyId` on the `Billing` table. All the data in the column will be lost.
  - Added the required column `tenantId` to the `Billing` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Billing" DROP CONSTRAINT "Billing_propertyId_fkey";

-- AlterTable
ALTER TABLE "Billing" DROP COLUMN "propertyId",
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
