'use client';

import { PaymentList } from '@/components/payment/PaymentList';
import { api } from '@/lib/trpc/react';
import { PaymentType } from '@prisma/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  Home,
  Mail,
  MessageCircle,
  Search,
  User,
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-8 w-8 rounded-full border-4 border-indigo-600 border-t-transparent"
        />
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage tenant payments and send reminders</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Total Revenue',
            value: `Rp ${stats?.totalRevenue?.toLocaleString() ?? 0}`,
            icon: DollarSign,
            color: 'green',
          },
          {
            title: 'Pending Payments',
            value: stats?.pendingPayments ?? 0,
            icon: CreditCard,
            color: 'blue',
          },
          {
            title: 'Due This Week',
            value: stats?.dueThisWeek ?? 0,
            icon: Clock,
            color: 'yellow',
          },
          {
            title: 'Overdue',
            value: stats?.overduePayments ?? 0,
            icon: AlertCircle,
            color: 'red',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="overflow-hidden rounded-xl bg-white p-6 shadow-lg transition-all hover:shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className={`rounded-full bg-${stat.color}-100 p-3`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="relative w-full lg:max-w-md">
          <input
            type="text"
            placeholder="Search tenant or room number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 pl-12 pr-4 py-3 focus:border-indigo-500 focus:ring-indigo-500"
          />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={selectedPaymentType}
            onChange={e => setSelectedPaymentType(e.target.value as PaymentType)}
            className="rounded-xl border border-gray-300 px-4 py-3 focus:border-indigo-500 focus:ring-indigo-500"
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
            className="rounded-xl border border-gray-300 px-4 py-3 focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </motion.div>
      {/* Tenant Cards */}
      <div className="space-y-4 w-full">
        <AnimatePresence>
          {filteredTenants?.map((tenant, index) => (
            <motion.div
              key={tenant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className="group w-full overflow-hidden rounded-xl bg-white p-6 shadow-lg transition-all hover:shadow-xl hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-gray-100 p-3">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        <span>Room {tenant.room?.number}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Due in 5 days</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSendNotification(tenant.id, 'whatsapp')}
                    className="rounded-full bg-green-100 p-2 text-green-600 transition-colors hover:bg-green-200"
                    title={`Send WhatsApp reminder for ${selectedPaymentType.toLowerCase()} payment`}
                  >
                    <MessageCircle className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSendNotification(tenant.id, 'email')}
                    className="rounded-full bg-blue-100 p-2 text-blue-600 transition-colors hover:bg-blue-200"
                    title={`Send email reminder for ${selectedPaymentType.toLowerCase()} payment`}
                  >
                    <Mail className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              <div className="mt-6">
                <PaymentList tenantId={tenant.id} paymentType={selectedPaymentType} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
