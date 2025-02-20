/*
  Warnings:

  - The values [OTHER] on the enum `ExpenseCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ExpenseCategory_new" AS ENUM ('SALARY', 'STAFF_BENEFITS', 'STAFF_TRAINING', 'ELECTRICITY', 'WATER', 'INTERNET', 'GAS', 'CLEANING', 'REPAIRS', 'GARDENING', 'PEST_CONTROL', 'OFFICE_SUPPLIES', 'MARKETING', 'INSURANCE', 'TAX', 'LICENSE_PERMIT', 'SECURITY', 'WASTE_MANAGEMENT', 'RENOVATION', 'FURNITURE', 'EQUIPMENT', 'EMERGENCY', 'LEGAL', 'CONSULTING', 'MISC_NON_OPERATIONAL');
ALTER TABLE "Expense" ALTER COLUMN "category" TYPE "ExpenseCategory_new" USING ("category"::text::"ExpenseCategory_new");
ALTER TYPE "ExpenseCategory" RENAME TO "ExpenseCategory_old";
ALTER TYPE "ExpenseCategory_new" RENAME TO "ExpenseCategory";
DROP TYPE "ExpenseCategory_old";
COMMIT;
