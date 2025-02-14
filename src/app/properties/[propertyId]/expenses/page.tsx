"use client";

import { ExpenseList } from "@/components/expense/ExpenseList";
import { useParams } from "next/navigation";

export default function ExpensesPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Property Expenses</h1>
      <ExpenseList propertyId={propertyId} />
    </div>
  );
}
