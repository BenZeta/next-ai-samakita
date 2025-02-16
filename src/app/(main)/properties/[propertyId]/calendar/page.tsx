"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format } from "date-fns";
import { parse } from "date-fns";
import { startOfWeek } from "date-fns";
import { getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { api } from "@/lib/trpc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { MaintenanceStatus, MaintenancePriority } from "@prisma/client";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: string;
  type: "occupancy" | "maintenance";
}

interface MaintenanceSchedule {
  id: string;
  title: string;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  createdAt: Date;
  updatedAt: Date;
  propertyId: string;
  roomId: string;
  room: {
    number: string;
  };
}

const maintenanceSchema = z.object({
  roomId: z.string().min(1, "Room is required"),
  startDate: z.date(),
  endDate: z.date(),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["cleaning", "repair", "inspection", "other"]),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

export default function RoomCalendarPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const [date, setDate] = useState(new Date());
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

  const { data: rooms, isLoading: isLoadingRooms } = api.room.list.useQuery({ propertyId });
  const { data: maintenanceSchedules } = api.maintenance.getRequests.useQuery(
    {
      propertyId,
    },
    {
      enabled: !!propertyId,
    }
  );

  const maintenanceMutation = api.room.scheduleMaintenance.useMutation({
    onSuccess: () => {
      toast.success("Maintenance scheduled successfully");
      setShowMaintenanceForm(false);
      setSelectedSlot(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      startDate: selectedSlot?.start,
      endDate: selectedSlot?.end,
    },
  });

  if (isLoadingRooms) {
    return <div>Loading...</div>;
  }

  const occupancyEvents: CalendarEvent[] =
    rooms?.flatMap((room) =>
      room.tenants.map((tenant) => ({
        id: tenant.id,
        title: `${room.number} - ${tenant.name}`,
        start: new Date(tenant.startDate!),
        end: new Date(tenant.endDate!),
        resourceId: room.id,
        type: "occupancy",
      }))
    ) || [];

  const maintenanceEvents: CalendarEvent[] =
    maintenanceSchedules?.requests.map((maintenance) => ({
      id: maintenance.id,
      title: `Room ${maintenance.roomNumber} - ${maintenance.title}`,
      start: maintenance.createdAt,
      end: maintenance.updatedAt,
      resourceId: maintenance.id,
      type: "maintenance" as const,
    })) || [];

  const events = [...occupancyEvents, ...maintenanceEvents];

  const resources = rooms?.map((room) => ({
    id: room.id,
    title: `Room ${room.number}`,
  }));

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end });
    setShowMaintenanceForm(true);
  };

  const onSubmit = async (data: MaintenanceFormData) => {
    await maintenanceMutation.mutateAsync(data);
    reset();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Room Availability Calendar</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="h-[800px] rounded-lg bg-white p-6 shadow">
            <Calendar
              localizer={localizer}
              events={events}
              resources={resources}
              resourceIdAccessor="id"
              resourceTitleAccessor="title"
              defaultView="month"
              views={["month", "week", "day", "agenda"]}
              step={60}
              date={date}
              onNavigate={setDate}
              selectable
              onSelectSlot={handleSelectSlot}
              eventPropGetter={(event: CalendarEvent) => ({
                className: `bg-${event.type === "occupancy" ? "indigo" : "red"}-600 text-white`,
              })}
            />
          </div>
        </div>

        {showMaintenanceForm && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Schedule Maintenance</h2>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4">
              <div>
                <label
                  htmlFor="roomId"
                  className="block text-sm font-medium text-gray-700">
                  Room
                </label>
                <select
                  id="roomId"
                  {...register("roomId")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                  <option value="">Select a room</option>
                  {rooms?.map((room) => (
                    <option
                      key={room.id}
                      value={room.id}>
                      Room {room.number}
                    </option>
                  ))}
                </select>
                {errors.roomId && <p className="mt-1 text-sm text-red-600">{errors.roomId.message}</p>}
              </div>

              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700">
                  Maintenance Type
                </label>
                <select
                  id="type"
                  {...register("type")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                  <option value="">Select type</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="repair">Repair</option>
                  <option value="inspection">Inspection</option>
                  <option value="other">Other</option>
                </select>
                {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  {...register("description")}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    {...register("startDate", { valueAsDate: true })}
                    defaultValue={selectedSlot?.start.toISOString().slice(0, 16)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    {...register("endDate", { valueAsDate: true })}
                    defaultValue={selectedSlot?.end.toISOString().slice(0, 16)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMaintenanceForm(false);
                    setSelectedSlot(null);
                    reset();
                  }}
                  className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  Schedule
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
