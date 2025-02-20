'use client';

import { api } from '@/lib/trpc/react';
import { ExpenseCategory } from '@prisma/client';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';

interface ExpenseFormProps {
  propertyId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ExpenseForm({ propertyId, onSuccess, onCancel }: ExpenseFormProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: '',
    description: '',
  });
  const [formattedAmount, setFormattedAmount] = useState('');

  const createMutation = api.expense.create.useMutation({
    onSuccess: () => {
      toast.success(t('expenses.toast.created'));
      onSuccess?.();
    },
    onError: error => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const formatAmount = (value: string) => {
    // Remove non-digit characters
    const number = value.replace(/\D/g, '');
    // Format with thousand separators
    return number ? parseInt(number).toLocaleString() : '';
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmount(e.target.value);
    setFormattedAmount(formatted);
    setFormData(prev => ({
      ...prev,
      amount: formatted.replace(/\D/g, ''),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category || !formData.date) {
      toast.error(t('expenses.toast.requiredFields'));
      return;
    }

    setIsLoading(true);
    try {
      await createMutation.mutateAsync({
        ...(propertyId && { propertyId }),
        category: formData.category as ExpenseCategory,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date),
        description: formData.description,
      });
    } catch (error) {
      console.error('Failed to create expense:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-foreground">
          {t('expenses.form.category')}
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
          className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('expenses.form.selectCategory')}</option>
          {Object.values(ExpenseCategory).map(cat => (
            <option key={cat} value={cat}>
              {t(`expenses.categories.${cat.toUpperCase()}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-foreground">
          {t('expenses.form.amount')}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            Rp
          </span>
          <input
            type="text"
            id="amount"
            value={formattedAmount}
            onChange={handleAmountChange}
            className="mt-1.5 block w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={t('expenses.form.amountPlaceholder')}
          />
        </div>
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-foreground">
          {t('expenses.form.date')}
        </label>
        <input
          type="date"
          id="date"
          value={formData.date}
          onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
          className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-foreground">
          {t('expenses.form.description')}
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={t('expenses.form.descriptionPlaceholder')}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
          >
            {t('common.cancel')}
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isLoading ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
}
