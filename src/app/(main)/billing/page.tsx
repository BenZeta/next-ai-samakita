'use client';

import { PaymentList } from '@/components/payment/PaymentList';
import { api } from '@/lib/trpc/react';
import { PaymentType } from '@prisma/client';
import {
  AlertCircle,
  Clock,
  CreditCard,
  DollarSign,
  Mail,
  MessageCircle,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function BillingPage() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType>(PaymentType.RENT);

  const { data: stats, isLoading: statsLoading } = api.billing.getStats.useQuery({ timeRange });
  const { data: tenants, isLoading: tenantsLoading } = api.tenant.getAll.useQuery();

  const sendNotificationMutation = api.billing.sendNotification.useMutation();

  const handleSendNotification = async (tenantId: string, method: 'email' | 'whatsapp') => {
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const filteredTenants = tenants?.filter(
    tenant =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.room?.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Billing Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Manage tenant payments and send reminders</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-card p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
          <div className="flex items-center">
            <div className="rounded-full bg-primary/10 p-3">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-semibold text-card-foreground">
                Rp {stats?.totalRevenue?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
          <div className="flex items-center">
            <div className="rounded-full bg-primary/10 p-3">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
              <p className="text-2xl font-semibold text-card-foreground">
                {stats?.pendingPayments ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
          <div className="flex items-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Due This Week</p>
              <p className="text-2xl font-semibold text-card-foreground">
                {stats?.dueThisWeek ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800">
          <div className="flex items-center">
            <div className="rounded-full bg-primary/10 p-3">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Overdue</p>
              <p className="text-2xl font-semibold text-card-foreground">
                {stats?.overduePayments ?? 0}
              </p>
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
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-foreground focus:border-primary focus:ring-primary"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPaymentType}
            onChange={e => setSelectedPaymentType(e.target.value as PaymentType)}
            className="rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:border-primary focus:ring-primary"
          >
            {Object.values(PaymentType).map(type => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()} Payments
              </option>
            ))}
          </select>
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
            className="rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:border-primary focus:ring-primary"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Tenant Payment Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredTenants?.map(tenant => (
          <div
            key={tenant.id}
            className="rounded-lg bg-card p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">{tenant.name}</h3>
                <p className="text-sm text-muted-foreground">Room {tenant.room?.number}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSendNotification(tenant.id, 'whatsapp')}
                  className="rounded-full bg-primary/10 p-2 text-primary hover:bg-primary/20"
                  title={`Send WhatsApp reminder for ${selectedPaymentType.toLowerCase()} payment`}
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleSendNotification(tenant.id, 'email')}
                  className="rounded-full bg-primary/10 p-2 text-primary hover:bg-primary/20"
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
