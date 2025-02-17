'use client';

import { api } from '@/lib/trpc/react';
import { ExpenseCategory } from '@prisma/client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface ExpenseListProps {
  propertyId?: string;
}

interface Room {
  number: string;
  tenants?: {
    id: string;
    name: string;
    status: 'ACTIVE' | 'INACTIVE';
  }[];
}

interface Property {
  id: string;
  name: string;
  address: string;
  rooms?: Room[];
}

interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string;
  property: Property;
}

interface ExpenseData {
  expenses: Expense[];
  summary: {
    total: number;
    byCategory: Record<string, number>;
  };
  pagination: {
    totalPages: number;
  };
}

export function ExpenseList({ propertyId }: ExpenseListProps) {
  const [category, setCategory] = useState<ExpenseCategory | undefined>();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: '',
    amount: '',
    date: '',
    description: '',
    vendor: '',
    notes: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const limit = 10;

  const { data, isLoading, refetch } = api.expense.list.useQuery(
    {
      propertyId,
      category,
      startDate,
      endDate,
      page,
      limit,
    },
    {
      keepPreviousData: true,
    }
  );

  const createMutation = api.expense.create.useMutation({
    onSuccess: () => {
      toast.success('Expense added successfully!');
      setIsAddingExpense(false);
      setNewExpense({
        category: '',
        amount: '',
        date: '',
        description: '',
        vendor: '',
        notes: '',
      });
      refetch();
    },
  });

  const deleteMutation = api.expense.delete.useMutation({
    onSuccess: () => {
      toast.success('Expense deleted successfully!');
      refetch();
    },
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteMutation.mutateAsync({ id });
      } catch (error) {
        console.error('Failed to delete expense:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) {
      toast.error('Please select a property first');
      return;
    }

    try {
      await createMutation.mutateAsync({
        propertyId,
        category: newExpense.category as ExpenseCategory,
        amount: parseFloat(newExpense.amount),
        date: new Date(newExpense.date),
        description: newExpense.description,
      });
    } catch (error) {
      console.error('Failed to create expense:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-medium text-card-foreground">Expense List</h2>
      </div>

      {/* Filters */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Category</label>
          <select
            value={category ?? 'all'}
            onChange={e =>
              setCategory(
                e.target.value === 'all' ? undefined : (e.target.value as ExpenseCategory)
              )
            }
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Categories</option>
            {Object.values(ExpenseCategory).map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="rounded-lg bg-accent/50 p-4 w-72">
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="mt-1 text-2xl font-semibold text-card-foreground">
                Rp {data.summary.total.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setIsAddingExpense(true)}
              className="h-12 w-40 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </button>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Property
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.expenses.map(expense => (
              <tr key={expense.id} className="hover:bg-muted/50">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-card-foreground">
                  {new Date(expense.date).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-card-foreground">
                  <span className="capitalize">{expense.category.toLowerCase()}</span>
                </td>
                <td className="px-6 py-4 text-sm text-card-foreground">{expense.description}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-card-foreground">
                  Rp {expense.amount.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-card-foreground">
                  {expense.property.name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="font-medium text-destructive hover:text-destructive/80"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md bg-card px-3 py-2 text-sm font-medium text-card-foreground hover:bg-accent disabled:opacity-50"
          >
            Previous
          </button>
          <span className="inline-flex items-center px-4 py-2 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md bg-card px-3 py-2 text-sm font-medium text-card-foreground hover:bg-accent disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
