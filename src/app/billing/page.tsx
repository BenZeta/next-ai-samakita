"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { PaymentList } from "@/components/payment/PaymentList";
import { CreditCard, DollarSign, Clock, AlertCircle } from "lucide-react";

export default function BillingPage() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");

  const { data: stats, isLoading } = api.billing.getStats.useQuery({ timeRange });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage payments and track financial status</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Payment Statistics</h2>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as "week" | "month" | "year")}
            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">Rp {stats?.totalRevenue?.toLocaleString() ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Payments</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.pendingPayments ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-full bg-yellow-100 p-3">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Due This Week</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.dueThisWeek ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.overduePayments ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <PaymentList />
      </div>
    </div>
  );
}
