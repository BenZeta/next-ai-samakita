'use client';

import { api } from '@/lib/trpc/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaintenancePriority, MaintenanceStatus } from '@prisma/client';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';
import { z } from 'zod';

const locales = {
  'en-US': require('date-fns/locale/en-US'),
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
  type: 'occupancy' | 'maintenance';
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
  roomId: z.string().min(1, 'properties.calendar.form.validation.roomRequired'),
  startDate: z.date(),
  endDate: z.date(),
  description: z.string().min(1, 'properties.calendar.form.validation.descriptionRequired'),
  type: z.enum(['cleaning', 'repair', 'inspection', 'other']),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

export default function RoomCalendarPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const [date, setDate] = useState(new Date());
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const t = useTranslations();

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
      toast.success(t('properties.calendar.toast.scheduled'));
      setShowMaintenanceForm(false);
      setSelectedSlot(null);
    },
    onError: error => {
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
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const occupancyEvents: CalendarEvent[] =
    rooms?.flatMap(room =>
      room.tenants.map(tenant => ({
        id: tenant.id,
        title: t('properties.calendar.events.occupancy', {
          room: room.number,
          tenant: tenant.name,
        }),
        start: new Date(tenant.startDate!),
        end: new Date(tenant.endDate!),
        resourceId: room.id,
        type: 'occupancy',
      }))
    ) || [];

  const maintenanceEvents: CalendarEvent[] =
    maintenanceSchedules?.requests.map(maintenance => ({
      id: maintenance.id,
      title: t('properties.calendar.events.maintenance', {
        room: maintenance.roomNumber,
        title: maintenance.title,
      }),
      start: maintenance.createdAt,
      end: maintenance.updatedAt,
      resourceId: maintenance.id,
      type: 'maintenance' as const,
    })) || [];

  const events = [...occupancyEvents, ...maintenanceEvents];

  const resources = rooms?.map(room => ({
    id: room.id,
    title: t('properties.calendar.resources.room', { number: room.number }),
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
    <div className="container mx-auto min-h-screen px-2 py-4 sm:px-4 sm:py-8">
      <h1 className="mb-4 text-xl font-bold text-foreground sm:mb-8 sm:text-3xl">
        {t('properties.calendar.title')}
      </h1>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="h-[500px] overflow-hidden rounded-lg border border-border bg-card p-2 shadow-sm sm:h-[600px] sm:p-4">
            <Calendar
              localizer={localizer}
              events={events}
              resources={resources}
              resourceIdAccessor="id"
              resourceTitleAccessor="title"
              defaultView="month"
              views={['month', 'week', 'day', 'agenda']}
              step={60}
              date={date}
              onNavigate={setDate}
              selectable
              onSelectSlot={handleSelectSlot}
              eventPropGetter={(event: CalendarEvent) => ({
                className: `bg-${event.type === 'occupancy' ? 'primary' : 'destructive'} text-white`,
              })}
              className="text-xs sm:text-sm"
            />
          </div>
        </div>

        {showMaintenanceForm && (
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {t('properties.calendar.scheduleMaintenance')}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-foreground">
                  {t('properties.calendar.form.room')}
                </label>
                <select
                  id="roomId"
                  {...register('roomId')}
                  className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t('properties.calendar.form.selectRoom')}</option>
                  {rooms?.map(room => (
                    <option key={room.id} value={room.id}>
                      {t('properties.calendar.resources.room', { number: room.number })}
                    </option>
                  ))}
                </select>
                {errors.roomId && (
                  <p className="mt-1 text-sm text-destructive">{t(errors.roomId.message!)}</p>
                )}
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-foreground">
                  {t('properties.calendar.form.maintenanceType')}
                </label>
                <select
                  id="type"
                  {...register('type')}
                  className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t('properties.calendar.form.selectType')}</option>
                  <option value="cleaning">{t('properties.calendar.form.types.cleaning')}</option>
                  <option value="repair">{t('properties.calendar.form.types.repair')}</option>
                  <option value="inspection">
                    {t('properties.calendar.form.types.inspection')}
                  </option>
                  <option value="other">{t('properties.calendar.form.types.other')}</option>
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-destructive">{t(errors.type.message!)}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground">
                  {t('properties.calendar.form.description')}
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={3}
                  className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-destructive">{t(errors.description.message!)}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-foreground">
                    {t('properties.calendar.form.startDate')}
                  </label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    {...register('startDate', { valueAsDate: true })}
                    defaultValue={selectedSlot?.start.toISOString().slice(0, 16)}
                    className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-destructive">{t(errors.startDate.message!)}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-foreground">
                    {t('properties.calendar.form.endDate')}
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    {...register('endDate', { valueAsDate: true })}
                    defaultValue={selectedSlot?.end.toISOString().slice(0, 16)}
                    className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-destructive">{t(errors.endDate.message!)}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMaintenanceForm(false);
                    setSelectedSlot(null);
                    reset();
                  }}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
