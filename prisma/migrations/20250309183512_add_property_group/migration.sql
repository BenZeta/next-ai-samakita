/*
  Warnings:

  - The values [CUSTOM] on the enum `ExpenseCategory` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `contractId` on the `Billing` table. All the data in the column will be lost.
  - You are about to drop the column `recurringFrequency` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `contractId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the `Configuration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Contract` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContractTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentSchedule` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `billingCycleStart` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nextBillingDate` to the `Lease` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ExpenseCategory_new" AS ENUM ('SALARY', 'STAFF_BENEFITS', 'STAFF_TRAINING', 'ELECTRICITY', 'WATER', 'INTERNET', 'GAS', 'CLEANING', 'REPAIRS', 'GARDENING', 'PEST_CONTROL', 'OFFICE_SUPPLIES', 'MARKETING', 'INSURANCE', 'TAX', 'LICENSE_PERMIT', 'SECURITY', 'WASTE_MANAGEMENT', 'RENOVATION', 'FURNITURE', 'EQUIPMENT', 'EMERGENCY', 'LEGAL', 'CONSULTING', 'MISC_NON_OPERATIONAL', 'OTHER');
ALTER TABLE "Expense" ALTER COLUMN "category" TYPE "ExpenseCategory_new" USING ("category"::text::"ExpenseCategory_new");
ALTER TYPE "ExpenseCategory" RENAME TO "ExpenseCategory_old";
ALTER TYPE "ExpenseCategory_new" RENAME TO "ExpenseCategory";
DROP TYPE "ExpenseCategory_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentFrequency" ADD VALUE 'BI_WEEKLY';
ALTER TYPE "PaymentFrequency" ADD VALUE 'SEMI_ANNUAL';
ALTER TYPE "PaymentFrequency" ADD VALUE 'ANNUAL';

-- DropForeignKey
ALTER TABLE "Billing" DROP CONSTRAINT "Billing_contractId_fkey";

-- DropForeignKey
ALTER TABLE "Configuration" DROP CONSTRAINT "Configuration_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Configuration" DROP CONSTRAINT "Configuration_userId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_roomId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_templateId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ContractTemplate" DROP CONSTRAINT "ContractTemplate_userId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_contractId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentSchedule" DROP CONSTRAINT "PaymentSchedule_contractId_fkey";

-- DropIndex
DROP INDEX "Billing_contractId_idx";

-- DropIndex
DROP INDEX "Payment_contractId_idx";

-- AlterTable
ALTER TABLE "Billing" DROP COLUMN "contractId";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "recurringFrequency",
ADD COLUMN     "recurringInterval" TEXT;

-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "billingCycleEnd" TIMESTAMP(3),
ADD COLUMN     "billingCycleStart" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "nextBillingDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "paymentFrequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "contractId";

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "customPaymentDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "paymentFrequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "propertyGroupId" TEXT;

-- DropTable
DROP TABLE "Configuration";

-- DropTable
DROP TABLE "Contract";

-- DropTable
DROP TABLE "ContractTemplate";

-- DropTable
DROP TABLE "PaymentSchedule";

-- DropEnum
DROP TYPE "ContractStatus";

-- CreateTable
CREATE TABLE "PropertyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyGroup_userId_idx" ON "PropertyGroup"("userId");

-- CreateIndex
CREATE INDEX "Property_propertyGroupId_idx" ON "Property"("propertyGroupId");

-- AddForeignKey
ALTER TABLE "PropertyGroup" ADD CONSTRAINT "PropertyGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_propertyGroupId_fkey" FOREIGN KEY ("propertyGroupId") REFERENCES "PropertyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
