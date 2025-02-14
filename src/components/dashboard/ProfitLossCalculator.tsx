"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { DollarSign, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

interface ProfitLossCalculatorProps {
  propertyId?: string;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export function ProfitLossCalculator({ propertyId }: ProfitLossCalculatorProps) {
  const [timeRange, setTimeRange] = useState<"month" | "quarter" | "year">("month");

  const { data: financialData, isLoading } = api.finance.getStats.useQuery({
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

  const totalRevenue = financialData?.totalRevenue ?? 0;
  const totalExpenses = financialData?.totalExpenses ?? 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const monthlyTrend = financialData?.monthlyTrend ?? [];

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Profit & Loss</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as "month" | "quarter" | "year")}
          className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-2">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Revenue</p>
              <p className="text-lg font-semibold text-gray-900">Rp {totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-red-100 p-2">
              <DollarSign className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Expenses</p>
              <p className="text-lg font-semibold text-gray-900">Rp {totalExpenses.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-2">{netProfit >= 0 ? <TrendingUp className="h-5 w-5 text-blue-600" /> : <TrendingDown className="h-5 w-5 text-blue-600" />}</div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Net Profit</p>
              <p className="text-lg font-semibold text-gray-900">Rp {netProfit.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex items-center">
            <div className="rounded-full bg-purple-100 p-2">
              <ArrowRight className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Profit Margin</p>
              <p className="text-lg font-semibold text-gray-900">{profitMargin.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-4 text-sm font-medium text-gray-500">Monthly Trend</h3>
        <div className="relative">
          <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gray-200"></div>
          <div className="flex h-[200px] items-end space-x-4">
            {monthlyTrend.map((month, index) => (
              <div
                key={index}
                className="flex-1">
                <div className="relative h-full">
                  {/* Expenses bar */}
                  <div
                    style={{
                      height: `${(month.expenses / Math.max(...monthlyTrend.map((m) => Math.max(m.revenue, m.expenses)))) * 100}%`,
                    }}
                    className="absolute bottom-0 w-full rounded bg-red-200"></div>
                  {/* Revenue bar */}
                  <div
                    style={{
                      height: `${(month.revenue / Math.max(...monthlyTrend.map((m) => Math.max(m.revenue, m.expenses)))) * 100}%`,
                    }}
                    className="absolute bottom-0 w-1/2 rounded bg-green-500"></div>
                </div>
                <div className="mt-2 text-center text-xs text-gray-500">{month.month}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-center space-x-6">
          <div className="flex items-center">
            <div className="mr-2 h-3 w-3 rounded bg-green-500"></div>
            <span className="text-sm text-gray-600">Revenue</span>
          </div>
          <div className="flex items-center">
            <div className="mr-2 h-3 w-3 rounded bg-red-200"></div>
            <span className="text-sm text-gray-600">Expenses</span>
          </div>
        </div>
      </div>
    </div>
  );
}
