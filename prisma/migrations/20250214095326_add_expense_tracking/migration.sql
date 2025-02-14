-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('electricity', 'water', 'maintenance', 'cleaning', 'security', 'internet', 'tax', 'insurance', 'salary', 'supplies', 'other');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "receiptUrl" TEXT,
    "vendor" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
