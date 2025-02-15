'use client';

import { api } from '@/lib/trpc/react';
import { AlertTriangle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { useState } from 'react';

interface MaintenanceTrackerProps {
  propertyId?: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  roomNumber: string;
  createdAt: string;
}

interface MaintenanceStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export function MaintenanceTracker({ propertyId }: MaintenanceTrackerProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>(
    'all'
  );

  const { data: maintenanceData, isLoading } = api.maintenance.getRequests.useQuery({
    propertyId,
    status: statusFilter === 'all' ? undefined : statusFilter,
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

  const requests = maintenanceData?.requests ?? [];
  const stats = maintenanceData?.stats ?? {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  };

  const getPriorityColor = (priority: MaintenanceRequest['priority']) => {
    switch (priority) {
      case 'HIGH':
        return 'text-destructive bg-destructive/10';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'LOW':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-muted-foreground bg-accent';
    }
  };

  const getStatusIcon = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'IN_PROGRESS':
        return <Wrench className="h-5 w-5 text-blue-600" />;
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-card-foreground">Maintenance Requests</h2>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
        >
          <option value="all">All Requests</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-accent/50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-card-foreground">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-yellow-100/50 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-800">Pending</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-900">{stats.pending}</p>
        </div>
        <div className="rounded-lg bg-blue-100/50 p-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">In Progress</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900">{stats.inProgress}</p>
        </div>
        <div className="rounded-lg bg-green-100/50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-800">Completed</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-900">{stats.completed}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flow-root">
          <ul role="list" className="divide-y divide-border">
            {requests.map(request => (
              <li key={request.id} className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 pt-1">{getStatusIcon(request.status)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-card-foreground">
                        {request.title}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(
                          request.priority
                        )}`}
                      >
                        {request.priority}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Room {request.roomNumber}</span>
                      <span>•</span>
                      <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {request.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
