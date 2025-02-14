"use client";

import { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format } from "date-fns";
import { parse } from "date-fns";
import { startOfWeek } from "date-fns";
import { getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { api } from "@/lib/trpc/react";
import type { Room, Tenant } from "@prisma/client";

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

interface RoomCalendarProps {
  roomId: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "occupancy" | "maintenance";
}

interface RoomWithTenants extends Room {
  tenants: Array<Tenant & { startDate: Date | null; endDate: Date | null }>;
}

export function RoomCalendar({ roomId }: RoomCalendarProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // Fetch room details including tenant occupancy and maintenance schedules
  const { data: room } = api.room.get.useQuery({ id: roomId }) as { data: RoomWithTenants | undefined };

  // Convert tenant stays and maintenance schedules to calendar events
  const events: CalendarEvent[] = [];

  // Add tenant occupancy periods
  room?.tenants?.forEach((tenant) => {
    if (tenant.startDate && tenant.endDate) {
      events.push({
        id: tenant.id,
        title: `Occupied by ${tenant.name}`,
        start: tenant.startDate,
        end: tenant.endDate,
        type: "occupancy",
      });
    }
  });

  // Add maintenance schedules (if implemented)
  // room?.maintenanceSchedules?.forEach((schedule) => {
  //   events.push({
  //     id: schedule.id,
  //     title: `Maintenance: ${schedule.description}`,
  //     start: new Date(schedule.startDate),
  //     end: new Date(schedule.endDate),
  //     type: "maintenance",
  //   });
  // });

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  return (
    <div className="h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        onSelectEvent={handleSelectEvent}
        eventPropGetter={(event: CalendarEvent) => ({
          className: `bg-${event.type === "occupancy" ? "indigo" : "orange"}-600 text-white`,
        })}
      />

      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-medium">{selectedEvent.title}</h3>
            <p className="mb-2 text-gray-600">Start: {format(selectedEvent.start, "PPP")}</p>
            <p className="mb-4 text-gray-600">End: {format(selectedEvent.end, "PPP")}</p>
            <button
              onClick={() => setShowEventModal(false)}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
