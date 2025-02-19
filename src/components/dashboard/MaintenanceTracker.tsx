'use client';

import { api } from '@/lib/trpc/react';
import { MaintenanceStatus } from '@prisma/client';
import { AlertTriangle, CheckCircle2, Clock, Wrench } from 'lucide-react';
import Link from 'next/link';
import { memo, useMemo } from 'react';
import { useTranslations } from 'use-intl';

interface MaintenanceTrackerProps {
  propertyId?: string;
}

const MaintenanceTracker = ({ propertyId }: MaintenanceTrackerProps) => {
  const t = useTranslations();

  const { data: maintenanceData, isLoading } = api.maintenance.getStats.useQuery(
    {
      propertyId,
    },
    {
      staleTime: 30000, // Cache data for 30 seconds
      refetchOnWindowFocus: false, // Don't refetch on window focus
    }
  );

  // Memoize stats calculations
  const stats = useMemo(() => {
    if (!maintenanceData) return null;
    return {
      total: maintenanceData.requests.length,
      pending: maintenanceData.requests.filter(r => r.status === 'PENDING').length,
      inProgress: maintenanceData.requests.filter(r => r.status === 'IN_PROGRESS').length,
      completed: maintenanceData.requests.filter(r => r.status === 'COMPLETED').length,
    };
  }, [maintenanceData]);

  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-500';
      case 'COMPLETED':
        return 'text-green-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: MaintenanceStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-[400px] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading maintenance data...</p>
        </div>
      </div>
    );
  }

  if (!maintenanceData || maintenanceData.requests.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {t('dashboard.widgets.maintenanceTracker.noData')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-card-foreground">
            {t('dashboard.widgets.maintenanceTracker.title')}
          </h2>
        </div>
        <Link
          href="/maintenance"
          className="text-sm text-primary hover:text-primary/90 hover:underline"
        >
          {t('dashboard.widgets.maintenanceTracker.viewAllRequests')}
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
        <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-400/10">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t('dashboard.widgets.maintenanceTracker.status.pending')}
            </p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-yellow-900 dark:text-yellow-100">
            {stats?.pending}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-400/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {t('dashboard.widgets.maintenanceTracker.status.completed')}
            </p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-green-900 dark:text-green-100">
            {stats?.completed}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Total</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {stats?.total}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-muted-foreground"
                    >
                      {t('dashboard.widgets.common.description')}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground"
                    >
                      {t('dashboard.widgets.common.room')}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground"
                    >
                      {t('dashboard.widgets.common.status')}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground"
                    >
                      {t('dashboard.widgets.common.reported')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {maintenanceData.requests.map(request => (
                    <tr key={request.id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <Wrench className="h-5 w-5 text-primary" />
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-foreground">{request.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">
                        {request.room}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(MaintenanceTracker);
