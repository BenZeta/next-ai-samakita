"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { ExpenseCategory } from "@prisma/client";
import { toast } from "react-toastify";
import { TRPCClientErrorLike } from "@trpc/client";
import { AppRouter } from "@/lib/api/root";

interface ExpenseListProps {
  propertyId: string;
}

interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  description?: string | null;
  vendor?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
}

export function ExpenseList({ propertyId }: ExpenseListProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

  const { data, refetch } = api.expense.list.useQuery({
    propertyId,
    category: selectedCategory,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    minAmount: minAmount ? parseFloat(minAmount) : undefined,
    maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
  });

  const deleteMutation = api.expense.delete.useMutation({
    onSuccess: () => {
      toast.success("Expense deleted successfully!");
      refetch();
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error(error.message);
    },
  });

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteMutation.mutateAsync({ id });
      } catch (error) {
        console.error("Failed to delete expense:", error);
      }
    }
  };

  const categoryOptions = Object.values(ExpenseCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={selectedCategory || ""}
            onChange={(e) => setSelectedCategory(e.target.value ? (e.target.value as ExpenseCategory) : undefined)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="">All Categories</option>
            {categoryOptions.map((category) => (
              <option
                key={category}
                value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Min Amount</label>
          <input
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Max Amount</label>
          <input
            type="number"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      {data?.summary && (
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="text-lg font-medium">Summary</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="mt-1 text-2xl font-semibold">Rp {data.summary.total.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Categories</p>
              <div className="mt-2 space-y-1 text-sm">
                {Object.entries(data.summary.byCategory).map(([category, amount]) => (
                  <div
                    key={category}
                    className="flex justify-between">
                    <span className="capitalize">{category.toLowerCase()}</span>
                    <span>Rp {amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Receipt</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.expenses.map((expense: Expense) => (
              <tr key={expense.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="capitalize">{expense.category.toLowerCase()}</span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">Rp {expense.amount.toLocaleString()}</td>
                <td className="whitespace-nowrap px-6 py-4">{new Date(expense.date).toLocaleDateString()}</td>
                <td className="px-6 py-4">{expense.description || "-"}</td>
                <td className="px-6 py-4">{expense.vendor || "-"}</td>
                <td className="px-6 py-4">
                  {expense.receiptUrl ? (
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900">
                      View Receipt
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-red-600 hover:text-red-900">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!data?.expenses || data.expenses.length === 0) && <div className="py-8 text-center text-gray-500">No expenses found for the selected filters.</div>}
      </div>
    </div>
  );
}
