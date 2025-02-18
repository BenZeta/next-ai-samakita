'use client';

import { api } from '@/lib/trpc/react';
import { ExpenseCategory } from '@prisma/client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface ExpenseListProps {
  propertyId?: string;
  isAddingExpense?: boolean;
  setIsAddingExpense?: (value: boolean) => void;
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
  property?: Property;
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

export function ExpenseList({
  propertyId,
  isAddingExpense: isAddingExpenseFromProps,
  setIsAddingExpense: setIsAddingExpenseFromProps,
}: ExpenseListProps) {
  const [category, setCategory] = useState<ExpenseCategory | undefined>();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [isAddingExpenseLocal, setIsAddingExpenseLocal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: '',
    amount: '',
    date: '',
    description: '',
    vendor: '',
    notes: '',
    propertyId: propertyId || undefined,
  });
  const [isUploading, setIsUploading] = useState(false);
  const limit = 10;

  const isAddingExpense = isAddingExpenseFromProps ?? isAddingExpenseLocal;
  const setIsAddingExpense = setIsAddingExpenseFromProps ?? setIsAddingExpenseLocal;

  const { data: propertiesData } = api.property.list.useQuery({
    search: '',
  });

  const properties = propertiesData?.properties || [];

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
        propertyId: propertyId || undefined,
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

    if (!newExpense.amount || !newExpense.category || !newExpense.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...(propertyId && { propertyId }),
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
        <h2 className="text-lg font-medium text-foreground">Expense List</h2>
        <button
          onClick={() => setIsAddingExpense(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
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
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
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
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="mb-6">
          <div className="rounded-lg bg-accent/50 p-4">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              Rp {data.summary.total.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
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
              {!propertyId && (
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Property
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.expenses.map(expense => (
              <tr key={expense.id} className="hover:bg-muted/50">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                  {new Date(expense.date).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                  {expense.category}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">{expense.description}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                  Rp {expense.amount.toLocaleString()}
                </td>
                {!propertyId && (
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                    {expense.property?.name}
                  </td>
                )}
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-sm font-medium text-destructive hover:text-destructive/90"
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
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-medium text-foreground">Add New Expense</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!propertyId && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">
                    Property
                  </label>
                  <select
                    value={newExpense.propertyId || ''}
                    onChange={e => setNewExpense(prev => ({ ...prev, propertyId: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Select Property</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground">Category</label>
                <select
                  value={newExpense.category}
                  onChange={e => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Select Category</option>
                  {Object.values(ExpenseCategory).map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">Amount</label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={e => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={e => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={newExpense.description}
                  onChange={e => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(false)}
                  className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
