import { db } from '@/lib/db';
import { inngest } from '@/lib/inngest';
import { serve } from 'inngest/next';

// Process recurring expenses daily
const processRecurringExpenses = inngest.createFunction(
  { id: 'process-recurring-expenses', name: 'Process Recurring Expenses' },
  { cron: '0 0 * * *' }, // Run daily at midnight
  async () => {
    const now = new Date();
    const dueExpenses = await db.expense.findMany({
      where: {
        isRecurring: true,
        nextDueDate: {
          lte: now,
        },
      },
    });

    const processedExpenses = await Promise.all(
      dueExpenses.map(async expense => {
        // Create new expense instance
        const newExpense = await db.expense.create({
          data: {
            category: expense.category,
            amount: expense.amount,
            date: now,
            description: expense.description,
            propertyId: expense.propertyId,
            userId: expense.userId,
            isRecurring: false,
          },
        });

        // Update next due date for original recurring expense
        let nextDueDate = new Date(expense.nextDueDate!);
        switch (expense.recurringFrequency) {
          case 'DAILY':
            nextDueDate.setDate(nextDueDate.getDate() + 1);
            break;
          case 'WEEKLY':
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case 'BIWEEKLY':
            nextDueDate.setDate(nextDueDate.getDate() + 14);
            break;
          case 'MONTHLY':
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case 'QUARTERLY':
            nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            break;
          case 'BIANNUALLY':
            nextDueDate.setMonth(nextDueDate.getMonth() + 6);
            break;
          case 'ANNUALLY':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
          default:
            // Default to monthly if no frequency is specified
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        await db.expense.update({
          where: { id: expense.id },
          data: {
            lastProcessedDate: now,
            nextDueDate,
          },
        });

        return newExpense;
      })
    );

    return { processedCount: processedExpenses.length };
  }
);

// Create the Inngest handler
const handler = serve({ client: inngest, functions: [processRecurringExpenses] });

// Export Next.js route handlers
export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
