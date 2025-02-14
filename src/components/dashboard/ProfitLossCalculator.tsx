"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { ExpenseCategory, PaymentType } from "@prisma/client";

interface ProfitLossCalculatorProps {
  propertyId?: string;
}

export function ProfitLossCalculator({ propertyId }: ProfitLossCalculatorProps) {
  const [timeRange, setTimeRange] = useState<"month" | "quarter" | "year">("month");

  const { data: financialData, isLoading } = api.finance.getProfitLoss.useQuery({
    propertyId,
    timeRange,
  });

  if (isLoading) {
    return (
      <div className="h-[400px] rounded-lg bg-white p-6 shadow">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const totalIncome = financialData?.income ?? 0;
  const totalExpenses = financialData?.expenses ?? 0;
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
  const expenseGrowth = financialData?.expenseGrowth ?? 0;
  const incomeGrowth = financialData?.incomeGrowth ?? 0;

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-medium text-gray-900">Profit & Loss</h2>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as "month" | "quarter" | "year")}
          className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">Total Income</p>
          <p className="mt-1 text-2xl font-semibold text-green-900">Rp {totalIncome.toLocaleString()}</p>
          <div className="mt-1 flex items-center text-sm">
            <TrendingUp className="mr-1 h-4 w-4 text-green-600" />
            <span className="text-green-600">+{incomeGrowth.toFixed(1)}% vs previous</span>
          </div>
        </div>
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Total Expenses</p>
          <p className="mt-1 text-2xl font-semibold text-red-900">Rp {totalExpenses.toLocaleString()}</p>
          <div className="mt-1 flex items-center text-sm">
            <TrendingDown className="mr-1 h-4 w-4 text-red-600" />
            <span className="text-red-600">
              {expenseGrowth > 0 ? "+" : ""}
              {expenseGrowth.toFixed(1)}% vs previous
            </span>
          </div>
        </div>
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">Net Profit</p>
          <p className="mt-1 text-2xl font-semibold text-blue-900">Rp {netProfit.toLocaleString()}</p>
          <p className="mt-1 text-sm text-blue-600">{profitMargin.toFixed(1)}% margin</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div>
          <h3 className="mb-4 text-sm font-medium text-gray-700">Income Breakdown</h3>
          <div className="space-y-4">
            {Object.values(PaymentType).map((type) => {
              const amount = financialData?.incomeByType[type] ?? 0;
              const percentage = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
              return (
                <div
                  key={type}
                  className="flex items-center">
                  <div className="w-32 text-sm capitalize text-gray-500">{type.toLowerCase()}</div>
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                  <div className="ml-4 w-24 text-right text-sm text-gray-500">Rp {amount.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-medium text-gray-700">Expense Breakdown</h3>
          <div className="space-y-4">
            {Object.values(ExpenseCategory).map((category) => {
              const amount = financialData?.expenseByCategory[category] ?? 0;
              const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              return (
                <div
                  key={category}
                  className="flex items-center">
                  <div className="w-32 text-sm capitalize text-gray-500">{category.toLowerCase()}</div>
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                  <div className="ml-4 w-24 text-right text-sm text-gray-500">Rp {amount.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-4 text-sm font-medium text-gray-700">Monthly Trend</h3>
        <div className="h-[200px] space-x-2">
          {financialData?.monthlyTrend.map((month, index) => (
            <div
              key={index}
              className="inline-flex h-full flex-col items-center">
              <div className="flex h-[160px] items-end space-x-1">
                <div
                  style={{ height: `${(month.income / (financialData?.maxMonthlyAmount ?? 1)) * 100}%` }}
                  className="w-3 rounded bg-green-500"></div>
                <div
                  style={{ height: `${(month.expenses / (financialData?.maxMonthlyAmount ?? 1)) * 100}%` }}
                  className="w-3 rounded bg-red-500"></div>
              </div>
              <span className="mt-2 text-xs text-gray-500">{month.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
