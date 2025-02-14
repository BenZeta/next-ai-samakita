"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { BarChart, Building, ArrowUp, ArrowDown } from "lucide-react";

interface OccupancyWidgetProps {
  propertyId?: string;
}

interface OccupancyHistoryItem {
  label: string;
  rate: number;
}

interface RoomTypeBreakdown {
  type: string;
  occupancyRate: number;
}

interface OccupancyData {
  currentRate: number;
  previousRate: number;
  totalRooms: number;
  occupiedRooms: number;
  history: OccupancyHistoryItem[];
  roomTypeBreakdown: RoomTypeBreakdown[];
}

export function OccupancyWidget({ propertyId }: OccupancyWidgetProps) {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");

  // Real-time updates with polling
  const { data: occupancyData, isLoading } = api.room.getOccupancyStats.useQuery(
    {
      propertyId,
      timeRange,
    },
    {
      refetchInterval: 30000, // Poll every 30 seconds for real-time updates
    }
  );

  if (isLoading) {
    return (
      <div className="h-[300px] rounded-lg bg-white p-6 shadow">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const currentOccupancy = occupancyData?.currentRate ?? 0;
  const previousOccupancy = occupancyData?.previousRate ?? 0;
  const occupancyChange = currentOccupancy - previousOccupancy;
  const roomTypeBreakdown = occupancyData?.roomTypeBreakdown ?? [];

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-medium text-gray-900">Occupancy Rate</h2>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as "week" | "month" | "year")}
          className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-semibold text-gray-900">{Math.round(currentOccupancy)}%</p>
          <div className={`flex items-center ${occupancyChange >= 0 ? "text-green-600" : "text-red-600"}`}>
            {occupancyChange >= 0 ? <ArrowUp className="mr-1 h-4 w-4" /> : <ArrowDown className="mr-1 h-4 w-4" />}
            <span className="text-sm font-medium">{Math.abs(Math.round(occupancyChange))}%</span>
            <span className="ml-1 text-xs text-gray-500">vs previous {timeRange}</span>
          </div>
        </div>

        {/* Historical comparison graph */}
        <div className="mt-6">
          <div className="flex h-[150px] items-end space-x-2">
            {occupancyData?.history.map((item, index) => (
              <div
                key={index}
                className="flex-1">
                <div
                  style={{ height: `${item.rate}%` }}
                  className="rounded bg-indigo-600 transition-all duration-300"></div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            {occupancyData?.history.map((item, index) => (
              <span key={index}>{item.label}</span>
            ))}
          </div>
        </div>

        {/* Room type breakdown */}
        <div className="mt-6">
          <h3 className="mb-4 text-sm font-medium text-gray-500">Room Type Breakdown</h3>
          <div className="space-y-4">
            {roomTypeBreakdown.map((item) => (
              <div key={item.type}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-600">{item.type}</span>
                  <span className="text-gray-900">{item.occupancyRate}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-indigo-600"
                    style={{ width: `${item.occupancyRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Total Rooms</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{occupancyData?.totalRooms ?? 0}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Occupied Rooms</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{occupancyData?.occupiedRooms ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
