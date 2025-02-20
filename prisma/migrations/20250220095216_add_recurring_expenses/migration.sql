-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastProcessedDate" TIMESTAMP(3),
ADD COLUMN     "nextDueDate" TIMESTAMP(3),
ADD COLUMN     "recurringInterval" TEXT;
