/*
  Warnings:

  - The values [pending,inProgress,resolved,cancelled] on the enum `ServiceRequestStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ServiceRequestStatus_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');
ALTER TABLE "ServiceRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ServiceRequest" ALTER COLUMN "status" TYPE "ServiceRequestStatus_new" USING ("status"::text::"ServiceRequestStatus_new");
ALTER TYPE "ServiceRequestStatus" RENAME TO "ServiceRequestStatus_old";
ALTER TYPE "ServiceRequestStatus_new" RENAME TO "ServiceRequestStatus";
DROP TYPE "ServiceRequestStatus_old";
ALTER TABLE "ServiceRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "ServiceRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
