'use client';

import { api } from '@/lib/trpc/react';
import { MaintenanceStatus } from '@prisma/client';
import { AlertTriangle, CheckCircle, Clock, Wrench } from 'lucide-react';
import Link from 'next/link';

interface MaintenanceTrackerProps {
  propertyId?: string;
}

export function MaintenanceTracker({ propertyId }: MaintenanceTrackerProps) {
  const { data: maintenanceData, isLoading } = api.maintenance.getStats.useQuery({
    propertyId,
  });

  if (isLoading) {
    return (
      <div className="h-[400px] rounded-lg bg-card p-6 shadow-sm">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const stats = maintenanceData?.stats ?? {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  };

  const requests = maintenanceData?.requests ?? [];

  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case MaintenanceStatus.PENDING:
        return 'bg-yellow-50 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-200';
      case MaintenanceStatus.IN_PROGRESS:
        return 'bg-blue-50 text-blue-800 dark:bg-blue-400/10 dark:text-blue-200';
      case MaintenanceStatus.COMPLETED:
        return 'bg-green-50 text-green-800 dark:bg-green-400/10 dark:text-green-200';
      default:
        return 'bg-gray-50 text-gray-800 dark:bg-gray-400/10 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: MaintenanceStatus) => {
    switch (status) {
      case MaintenanceStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case MaintenanceStatus.IN_PROGRESS:
        return <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case MaintenanceStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-card-foreground">Maintenance Tracker</h2>
        </div>
        <Link
          href="/maintenance"
          className="text-sm text-primary hover:text-primary/90 hover:underline"
        >
          View All Requests
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-background/80 p-4 dark:bg-secondary/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Total Requests</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-400/10">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Pending</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-900 dark:text-yellow-300">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-400/10">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">In Progress</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-300">
            {stats.inProgress}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-400/10">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Completed</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-900 dark:text-green-300">
            {stats.completed}
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
                      Description
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground"
                    >
                      Room
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-muted-foreground"
                    >
                      Reported
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-muted-foreground"
                    >
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map(request => (
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
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            request.priority === 'HIGH'
                              ? 'bg-red-50 text-red-800 dark:bg-red-400/10 dark:text-red-200'
                              : request.priority === 'MEDIUM'
                                ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-200'
                                : 'bg-green-50 text-green-800 dark:bg-green-400/10 dark:text-green-200'
                          }`}
                        >
                          {request.priority}
                        </span>
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
}
