/*
  Warnings:

  - You are about to drop the column `contractFile` on the `Tenant` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('pending', 'signed', 'rejected', 'expired');

-- DropIndex
DROP INDEX "Tenant_ktpNumber_key";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "contractFile",
ADD COLUMN     "contractSignedAt" TIMESTAMP(3),
ADD COLUMN     "contractStatus" "ContractStatus" DEFAULT 'pending',
ADD COLUMN     "contractUrl" TEXT,
ADD COLUMN     "signature" TEXT,
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "endDate" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending';
