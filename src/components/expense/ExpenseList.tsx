'use client';

import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { DatePicker } from '@/components/ui/DatePicker';
import { api } from '@/lib/trpc/react';
import { ExpenseCategory } from '@prisma/client';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';

interface ExpenseListProps {
  propertyId?: string | null;
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
    operationalTotal: number;
    nonOperationalTotal: number;
  };
  pagination: {
    totalPages: number;
  };
}

interface NewExpense {
  category: string;
  amount: string;
  date: string;
  description: string;
  vendor: string;
  notes: string;
  propertyId: string | null | undefined;
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm }: DeleteConfirmationModalProps) {
  const t = useTranslations();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center">
          <div className="mr-4 rounded-full bg-destructive/10 p-3">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-medium text-card-foreground">
            {t('expenses.actions.confirmDelete')}
          </h3>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent"
          >
            {t('expenses.actions.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            {t('expenses.actions.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExpenseList({
  propertyId,
  isAddingExpense: isAddingExpenseFromProps,
  setIsAddingExpense: setIsAddingExpenseFromProps,
}: ExpenseListProps) {
  const t = useTranslations();
  const [category, setCategory] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [expenseType, setExpenseType] = useState<'ALL' | 'OPERATIONAL' | 'NON_OPERATIONAL'>('ALL');
  const [isAddingExpenseLocal, setIsAddingExpenseLocal] = useState(false);
  const [newExpense, setNewExpense] = useState<NewExpense>({
    category: '',
    amount: '',
    date: '',
    description: '',
    vendor: '',
    notes: '',
    propertyId: propertyId === null ? null : propertyId,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddExpense, setQuickAddExpense] = useState<{
    category: ExpenseCategory | '';
    amount: string;
    description: string;
    isRecurring: boolean;
    recurringInterval?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    formattedAmount: string;
  }>({
    category: '',
    amount: '',
    description: '',
    isRecurring: false,
    formattedAmount: '',
  });
  const limit = 10;

  const isAddingExpense = isAddingExpenseFromProps ?? isAddingExpenseLocal;
  const setIsAddingExpense = setIsAddingExpenseFromProps ?? setIsAddingExpenseLocal;

  const { data: propertiesData } = api.property.list.useQuery({
    search: '',
  });

  const properties = propertiesData?.properties || [];

  const { data, isLoading, refetch } = api.expense.list.useQuery({
    propertyId: propertyId || undefined,
    category: category === 'ALL' ? undefined : category,
    startDate,
    endDate,
    page,
    expenseType,
  });

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
        propertyId: propertyId === null ? null : propertyId,
      });
      refetch();
    },
  });

  const deleteMutation = api.expense.delete.useMutation({
    onSuccess: () => {
      toast.success(t('common.success'));
      refetch();
    },
    onError: () => {
      toast.error(t('common.error'));
    },
  });

  const quickAddMutation = api.expense.quickAddOperational.useMutation({
    onSuccess: () => {
      toast.success('Operational expense added successfully!');
      setIsQuickAddOpen(false);
      setQuickAddExpense({
        category: '',
        amount: '',
        description: '',
        isRecurring: false,
        formattedAmount: '',
      });
      refetch();
    },
  });

  const handleDelete = async (id: string) => {
    setDeleteConfirmation({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteConfirmation.id) {
      try {
        await deleteMutation.mutate({ id: deleteConfirmation.id });
      } catch (error) {
        console.error('Failed to delete expense:', error);
      }
    }
    setDeleteConfirmation({ isOpen: false, id: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newExpense.amount || !newExpense.category || !newExpense.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...(propertyId !== null && propertyId !== undefined && { propertyId }),
        category: newExpense.category as ExpenseCategory,
        amount: parseFloat(newExpense.amount),
        date: new Date(newExpense.date),
        description: newExpense.description,
      });
    } catch (error) {
      console.error('Failed to create expense:', error);
    }
  };

  const handlePropertyChange = (value: string) => {
    setNewExpense(prev => ({
      ...prev,
      propertyId: value === '' ? null : value,
    }));
  };

  const formatAmount = (value: string) => {
    // Remove non-digit characters
    const number = value.replace(/\D/g, '');
    // Format with thousand separators
    return number ? parseInt(number).toLocaleString() : '';
  };

  const handleQuickAddAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmount(e.target.value);
    setQuickAddExpense(prev => ({
      ...prev,
      formattedAmount: formatted,
      amount: formatted.replace(/\D/g, ''),
    }));
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quickAddExpense.amount || !quickAddExpense.category || !quickAddExpense.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (quickAddExpense.isRecurring && !quickAddExpense.recurringInterval) {
      toast.error('Please select a recurring interval');
      return;
    }

    try {
      await quickAddMutation.mutateAsync({
        ...(propertyId !== null && propertyId !== undefined && { propertyId }),
        category: quickAddExpense.category as ExpenseCategory,
        amount: parseFloat(quickAddExpense.amount),
        description: quickAddExpense.description,
        isRecurring: quickAddExpense.isRecurring,
        recurringInterval: quickAddExpense.recurringInterval,
      });
    } catch (error) {
      console.error('Failed to quick add expense:', error);
      toast.error('Failed to add operational expense');
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <select
            value={expenseType}
            onChange={e => setExpenseType(e.target.value as typeof expenseType)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:h-10"
          >
            <option value="ALL">{t('expenses.filters.all')}</option>
            <option value="OPERATIONAL">{t('expenses.filters.operational')}</option>
            <option value="NON_OPERATIONAL">{t('expenses.filters.nonOperational')}</option>
          </select>

          <select
            value={category}
            onChange={e => setCategory(e.target.value as ExpenseCategory | 'ALL')}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:h-10"
          >
            <option value="ALL">{t('expenses.categories.ALL')}</option>
            {Object.values(ExpenseCategory).map(cat => (
              <option key={cat} value={cat}>
                {t(`expenses.categories.${cat.toUpperCase()}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring sm:h-10"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('expenses.form.quickAddOperational')}
          </button>
          <button
            onClick={() => setIsAddingExpense(true)}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring sm:h-10"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('expenses.form.add')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="flex-1">
          <label htmlFor="startDate" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('expenses.filters.startDate')}
          </label>
          <DatePicker
            value={startDate ? new Date(startDate) : null}
            onChange={date => setStartDate(date ? date.toISOString().split('T')[0] : '')}
            placeholder={t('expenses.filters.startDate')}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="endDate" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('expenses.filters.endDate')}
          </label>
          <DatePicker
            value={endDate ? new Date(endDate) : null}
            onChange={date => setEndDate(date ? date.toISOString().split('T')[0] : '')}
            placeholder={t('expenses.filters.endDate')}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[200px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-background/50 px-3 py-8 text-center sm:px-4 sm:py-12">
          <p className="text-base font-medium text-foreground sm:text-lg">
            {t('expenses.noExpenses')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('expenses.noExpensesDescription')}
          </p>
          <button
            onClick={() => setIsAddingExpense(true)}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('expenses.actions.add')}
          </button>
        </div>
      ) : data.expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-background/50 px-3 py-8 text-center sm:px-4 sm:py-12">
          <p className="text-base font-medium text-foreground sm:text-lg">
            {t('expenses.noExpenses')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('expenses.noExpensesDescription')}
          </p>
          <button
            onClick={() => setIsAddingExpense(true)}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('expenses.form.add')}
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-1 sm:gap-4 lg:grid-cols-3">
            <div className="rounded-lg bg-accent/50 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                {t('expenses.list.totalExpenses')}
              </p>
              <p className="mt-1 text-xl font-bold">Rp {data.summary.total.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-accent/50 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                {t('expenses.list.operationalExpenses')}
              </p>
              <p className="mt-1 text-xl font-bold">
                Rp {data.summary.operationalTotal.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-accent/50 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                {t('expenses.list.nonOperationalExpenses')}
              </p>
              <p className="mt-1 text-xl font-bold">
                Rp {data.summary.nonOperationalTotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground sm:px-4">
                    {t('expenses.list.table.date')}
                  </th>
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground sm:px-4">
                    {t('expenses.list.table.category')}
                  </th>
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground sm:px-4">
                    {t('expenses.list.table.description')}
                  </th>
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground sm:px-4">
                    {t('expenses.list.table.amount')}
                  </th>
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground sm:px-4">
                    {t('expenses.list.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-foreground sm:px-4">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-foreground sm:px-4">
                      {t(`expenses.categories.${expense.category.toUpperCase()}`)}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-3 text-sm text-foreground sm:px-4">
                      {expense.description}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-foreground sm:px-4">
                      Rp {expense.amount.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground sm:px-4">
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:mt-6 sm:flex-row sm:gap-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex w-full items-center justify-center rounded-lg bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
              >
                {t('common.previous')}
              </button>
              <span className="text-sm text-muted-foreground">
                {t('common.page')} {page} {t('common.of')} {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="inline-flex w-full items-center justify-center rounded-lg bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}

      {isAddingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsAddingExpense(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg sm:p-6">
            <h3 className="mb-4 text-lg font-medium text-card-foreground">
              {t('expenses.form.title')}
            </h3>
            <ExpenseForm
              propertyId={propertyId === null ? undefined : propertyId}
              onSuccess={() => {
                setIsAddingExpense(false);
                refetch();
              }}
              onCancel={() => setIsAddingExpense(false)}
            />
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
      />

      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsQuickAddOpen(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg sm:p-6">
            <h3 className="mb-4 text-lg font-medium text-card-foreground">
              {t('expenses.form.quickAddOperational')}
            </h3>
            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-foreground">
                  {t('expenses.form.category')}
                </label>
                <select
                  id="category"
                  value={quickAddExpense.category}
                  onChange={e =>
                    setQuickAddExpense(prev => ({
                      ...prev,
                      category: e.target.value as ExpenseCategory,
                    }))
                  }
                  className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t('expenses.categories.ALL')}</option>
                  {Object.values(ExpenseCategory)
                    .filter(isOperationalExpense)
                    .map(cat => (
                      <option key={cat} value={cat}>
                        {t(`expenses.categories.${cat.toUpperCase()}`)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-foreground">
                  {t('expenses.quickAdd.amount')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    Rp
                  </span>
                  <input
                    type="text"
                    id="amount"
                    value={quickAddExpense.formattedAmount}
                    onChange={handleQuickAddAmountChange}
                    className="mt-1.5 block w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t('expenses.quickAdd.amountPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground">
                  {t('expenses.quickAdd.description')}
                </label>
                <textarea
                  id="description"
                  value={quickAddExpense.description}
                  onChange={e =>
                    setQuickAddExpense(prev => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('expenses.quickAdd.descriptionPlaceholder')}
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={quickAddExpense.isRecurring}
                    onChange={e =>
                      setQuickAddExpense(prev => ({ ...prev, isRecurring: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-foreground">
                    {t('expenses.quickAdd.recurring')}
                  </label>
                </div>

                {quickAddExpense.isRecurring && (
                  <div className="mt-3">
                    <label
                      htmlFor="recurringInterval"
                      className="block text-sm font-medium text-foreground"
                    >
                      {t('expenses.quickAdd.interval')}
                    </label>
                    <select
                      id="recurringInterval"
                      value={quickAddExpense.recurringInterval}
                      onChange={e =>
                        setQuickAddExpense(prev => ({
                          ...prev,
                          recurringInterval: e.target.value as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
                        }))
                      }
                      className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="MONTHLY">{t('expenses.quickAdd.intervals.monthly')}</option>
                      <option value="QUARTERLY">
                        {t('expenses.quickAdd.intervals.quarterly')}
                      </option>
                      <option value="YEARLY">{t('expenses.quickAdd.intervals.yearly')}</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={quickAddMutation.isLoading}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {quickAddMutation.isLoading ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to check if a category is operational
function isOperationalExpense(category: ExpenseCategory): boolean {
  switch (category) {
    case ExpenseCategory.SALARY:
    case ExpenseCategory.STAFF_BENEFITS:
    case ExpenseCategory.STAFF_TRAINING:
    case ExpenseCategory.ELECTRICITY:
    case ExpenseCategory.WATER:
    case ExpenseCategory.INTERNET:
    case ExpenseCategory.GAS:
    case ExpenseCategory.CLEANING:
    case ExpenseCategory.REPAIRS:
    case ExpenseCategory.GARDENING:
    case ExpenseCategory.PEST_CONTROL:
    case ExpenseCategory.OFFICE_SUPPLIES:
    case ExpenseCategory.MARKETING:
    case ExpenseCategory.INSURANCE:
    case ExpenseCategory.TAX:
    case ExpenseCategory.LICENSE_PERMIT:
    case ExpenseCategory.SECURITY:
    case ExpenseCategory.WASTE_MANAGEMENT:
      return true;
    default:
      return false;
  }
}
