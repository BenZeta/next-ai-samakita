"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { PaymentList } from "@/components/payment/PaymentList";
import { CreditCard, DollarSign, Clock, AlertCircle, Mail, MessageCircle, Search, Ban } from "lucide-react";
import { PaymentStatus, PaymentType } from "@prisma/client";
import { toast } from "react-hot-toast";

export default function BillingPage() {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType>(PaymentType.RENT);

  const { data: stats, isLoading: statsLoading } = api.billing.getStats.useQuery({ timeRange });
  const { data: tenants, isLoading: tenantsLoading } = api.tenant.getAll.useQuery();
  
  const sendNotificationMutation = api.billing.sendNotification.useMutation();

  const handleSendNotification = async (tenantId: string, method: "email" | "whatsapp") => {
    try {
      await sendNotificationMutation.mutateAsync({ 
        tenantId, 
        method,
        paymentType: selectedPaymentType,
      });
      toast.success(`${selectedPaymentType} payment reminder sent via ${method}`);
    } catch (error) {
      toast.error(`Failed to send ${method} notification`);
    }
  };

  if (statsLoading || tenantsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const filteredTenants = tenants?.filter(tenant => 
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.room?.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage tenant payments and send reminders</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-lg transition-all hover:shadow-xl">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                Rp {stats?.totalRevenue?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-lg transition-all hover:shadow-xl">
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

        <div className="rounded-lg bg-white p-6 shadow-lg transition-all hover:shadow-xl">
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

        <div className="rounded-lg bg-white p-6 shadow-lg transition-all hover:shadow-xl">
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

      {/* Search, Filter, and Payment Type Section */}
      <div className="mb-6 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search tenant or room number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPaymentType}
            onChange={(e) => setSelectedPaymentType(e.target.value as PaymentType)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          >
            {Object.values(PaymentType).map((type) => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()} Payments
              </option>
            ))}
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as "week" | "month" | "year")}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Tenant Payment Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredTenants?.map((tenant) => (
          <div key={tenant.id} className="rounded-lg bg-white p-6 shadow-lg transition-all hover:shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{tenant.name}</h3>
                <p className="text-sm text-gray-600">Room {tenant.room?.number}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSendNotification(tenant.id, "whatsapp")}
                  className="rounded-full bg-green-100 p-2 text-green-600 hover:bg-green-200"
                  title={`Send WhatsApp reminder for ${selectedPaymentType.toLowerCase()} payment`}
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleSendNotification(tenant.id, "email")}
                  className="rounded-full bg-blue-100 p-2 text-blue-600 hover:bg-blue-200"
                  title={`Send email reminder for ${selectedPaymentType.toLowerCase()} payment`}
                >
                  <Mail className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <PaymentList tenantId={tenant.id} paymentType={selectedPaymentType} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
