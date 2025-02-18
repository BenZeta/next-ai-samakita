'use client';

import { ExpenseList } from '@/components/expense/ExpenseList';
import { useParams } from 'next/navigation';

export default function ExpensesPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;

  if (!propertyId) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-lg font-medium text-muted-foreground">No property ID provided</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-[calc(100vh-4rem)] px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">Property Expenses</h1>
      <ExpenseList propertyId={propertyId} />
    </div>
  );
}
