'use client';

import { api } from '@/lib/trpc/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';

const checkInItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  condition: z.string().min(1, 'Condition is required'),
  notes: z.string().optional(),
});

type CheckInItemFormData = z.infer<typeof checkInItemSchema>;

interface CheckInFormProps {
  tenantId: string;
}

interface CheckInItem {
  id: string;
  itemName: string;
  condition: string;
  notes?: string | null;
}

const COMMON_ITEMS = [
  'Keys',
  'Door Lock',
  'Windows',
  'Lights',
  'Air Conditioner',
  'Fan',
  'Bed',
  'Mattress',
  'Wardrobe',
  'Desk',
  'Chair',
  'Bathroom Fixtures',
];

const COMMON_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'];

export function CheckInForm({ tenantId }: CheckInFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CheckInItemFormData>({
    resolver: zodResolver(checkInItemSchema),
  });

  const { data: checkInItems, refetch } = api.tenant.detail.useQuery(
    { id: tenantId },
    {
      select: data => data.checkInItems,
    }
  );

  const addCheckInItemMutation = api.tenant.addCheckInItem.useMutation({
    onSuccess: () => {
      toast.success('Check-in item added successfully!');
      reset();
      refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: CheckInItemFormData) => {
    setIsLoading(true);
    try {
      await addCheckInItemMutation.mutateAsync({
        tenantId,
        ...data,
      });
    } catch (error) {
      console.error('Failed to add check-in item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Item Name</label>
          <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {COMMON_ITEMS.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={`rounded-md px-4 py-2 text-sm font-medium ${selectedItem === item ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <input
            type="text"
            {...register('itemName')}
            value={selectedItem}
            onChange={e => setSelectedItem(e.target.value)}
            placeholder="Enter item name or select from above"
            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.itemName && (
            <p className="mt-1 text-sm text-red-600">{errors.itemName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
            Condition
          </label>
          <select
            id="condition"
            {...register('condition')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select condition</option>
            {COMMON_CONDITIONS.map(condition => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
          {errors.condition && (
            <p className="mt-1 text-sm text-red-600">{errors.condition.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            placeholder="Optional notes about the item's condition"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Adding...' : 'Add Item'}
        </button>
      </form>

      <div>
        <h3 className="text-lg font-medium">Check-in Items</h3>
        <div className="mt-4 space-y-4">
          {checkInItems?.map((item: CheckInItem) => (
            <div key={item.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{item.itemName}</h4>
                  <p className="text-sm text-gray-600">Condition: {item.condition}</p>
                  {item.notes && <p className="mt-1 text-sm text-gray-500">{item.notes}</p>}
                </div>
              </div>
            </div>
          ))}

          {checkInItems?.length === 0 && (
            <p className="text-center text-gray-500">No check-in items added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
