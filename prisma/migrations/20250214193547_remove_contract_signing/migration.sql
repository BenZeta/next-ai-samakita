/*
  Warnings:

  - You are about to drop the column `contractSigned` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `contractSignedAt` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `signature` on the `Tenant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "contractSigned",
DROP COLUMN "contractSignedAt",
DROP COLUMN "signature";
