"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { Wrench, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface MaintenanceTrackerProps {
  propertyId?: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: Date;
  updatedAt: Date;
  description: string;
  roomNumber: string;
}

export function MaintenanceTracker({ propertyId }: MaintenanceTrackerProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "IN_PROGRESS" | "COMPLETED">("all");

  const { data: maintenanceData, isLoading } = api.maintenance.getRequests.useQuery({
    propertyId,
    status: statusFilter === "all" ? undefined : statusFilter,
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

  const requests = maintenanceData?.requests ?? [];
  const stats = maintenanceData?.stats ?? {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  };

  const getPriorityColor = (priority: MaintenanceRequest["priority"]) => {
    switch (priority) {
      case "HIGH":
        return "text-red-600 bg-red-100";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-100";
      case "LOW":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: MaintenanceRequest["status"]) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "IN_PROGRESS":
        return <Wrench className="h-5 w-5 text-blue-600" />;
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Wrench className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-medium text-gray-900">Maintenance Requests</h2>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
          <option value="all">All Requests</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-500">Total Requests</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-800">Pending</p>
          <p className="mt-1 text-2xl font-semibold text-yellow-900">{stats.pending}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">In Progress</p>
          <p className="mt-1 text-2xl font-semibold text-blue-900">{stats.inProgress}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-green-900">{stats.completed}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flow-root">
          <ul
            role="list"
            className="-my-5 divide-y divide-gray-200">
            {requests.map((request) => (
              <li
                key={request.id}
                className="py-5">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">{getStatusIcon(request.status)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{request.title}</p>
                    <p className="truncate text-sm text-gray-500">Room {request.roomNumber}</p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(request.priority)}`}>{request.priority}</span>
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-500">{new Date(request.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 line-clamp-2">{request.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
