/*
  Warnings:

  - Added the required column `userId` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- First make propertyId optional
ALTER TABLE "Expense" ALTER COLUMN "propertyId" DROP NOT NULL;

-- Add userId column as nullable first
ALTER TABLE "Expense" ADD COLUMN "userId" TEXT;

-- Update existing expenses with userId from property
UPDATE "Expense" e
SET "userId" = p."userId"
FROM "Property" p
WHERE e."propertyId" = p.id;

-- Update any remaining expenses without userId to use the first admin user
UPDATE "Expense" e
SET "userId" = (SELECT id FROM "User" WHERE "isAdmin" = true LIMIT 1)
WHERE e."userId" IS NULL;

-- Make userId required
ALTER TABLE "Expense" ALTER COLUMN "userId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
