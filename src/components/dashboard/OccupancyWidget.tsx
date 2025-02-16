'use client';

import { api } from '@/lib/trpc/react';
import { ArrowDown, ArrowUp, Building } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const { data: session } = useSession();
  const isVerified = (session as any)?.token?.businessVerified === true;

  const { data: occupancyData, isLoading } = api.room.getOccupancyStats.useQuery(
    {
      propertyId,
      timeRange,
    },
    {
      enabled: isVerified,
      retry: false,
    }
  );

  if (!isVerified) {
    return (
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Building className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-card-foreground">Occupancy Rate</h2>
        </div>
        <div className="mt-6 text-center text-muted-foreground">
          Complete business verification to view occupancy statistics
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[300px] rounded-lg bg-card p-6 shadow-sm">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!occupancyData) {
    return (
      <div className="h-[300px] rounded-lg bg-card p-6 shadow-sm">
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">No occupancy data available</p>
        </div>
      </div>
    );
  }

  const currentOccupancy = occupancyData.currentRate;
  const previousOccupancy = occupancyData.previousRate;
  const occupancyChange = currentOccupancy - previousOccupancy;
  const roomTypeBreakdown = occupancyData.roomTypeBreakdown;
  const history = occupancyData.history;

  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
          <p className="mb-1 font-medium text-foreground">{label}</p>
          <p className="text-sm text-primary">Occupancy: {Math.round(payload[0].value)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Building className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-card-foreground">Occupancy Rate</h2>
        </div>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
          className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      <div className="mt-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
          <p className="text-3xl font-bold text-card-foreground">{Math.round(currentOccupancy)}%</p>
          <div
            className={`flex items-center ${
              occupancyChange >= 0 ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {occupancyChange >= 0 ? (
              <ArrowUp className="mr-1 h-4 w-4" />
            ) : (
              <ArrowDown className="mr-1 h-4 w-4" />
            )}
            <span className="text-sm font-medium">{Math.abs(Math.round(occupancyChange))}%</span>
            <span className="ml-1 text-xs text-muted-foreground">vs previous {timeRange}</span>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="mt-6 h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={history}
              margin={{
                top: 5,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={value => `${Math.round(value)}%`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip content={CustomTooltip} />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorOccupancy)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Room type breakdown */}
        <div className="mt-10">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">Room Type Breakdown</h3>
          <div className="space-y-3">
            {roomTypeBreakdown.map(item => (
              <div key={item.type}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-card-foreground">
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1).toLowerCase()}
                  </span>
                  <span className="text-muted-foreground">{Math.round(item.occupancyRate)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${item.occupancyRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-accent/50 p-4">
            <p className="text-sm font-medium text-muted-foreground">Total Rooms</p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">
              {occupancyData.totalRooms}
            </p>
          </div>
          <div className="rounded-lg bg-accent/50 p-4">
            <p className="text-sm font-medium text-muted-foreground">Occupied Rooms</p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">
              {occupancyData.occupiedRooms}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
