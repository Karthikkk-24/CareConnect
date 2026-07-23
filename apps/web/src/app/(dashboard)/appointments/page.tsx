'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Calendar, Clock } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  APPOINTMENTS_QUERY,
  CANCEL_APPOINTMENT_MUTATION,
  ME_QUERY,
  RESCHEDULE_APPOINTMENT_MUTATION,
  UPDATE_APPOINTMENT_STATUS_MUTATION,
} from '@/lib/graphql/queries';

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number) {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(isoDate: string) {
  const d = new Date(isoDate + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'cancelled':
    case 'no_show':
      return 'error' as const;
    case 'checked_in':
      return 'info' as const;
    default:
      return 'default' as const;
  }
};

type Appt = {
  id: string;
  scheduledAt: string;
  reason?: string;
  status: string;
  patient?: { fullName: string };
  doctor?: { fullName: string };
};

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [listError, setListError] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const weekStart = startOfWeek(selectedDate);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const { data, loading, refetch, error } = useQuery(APPOINTMENTS_QUERY, {
    variables: {
      hospitalId,
      date: view === 'day' ? selectedDate : undefined,
    },
    skip: !hospitalId,
  });

  const [updateStatus] = useMutation(UPDATE_APPOINTMENT_STATUS_MUTATION, {
    onCompleted: () => refetch(),
  });
  const [cancelAppointment] = useMutation(CANCEL_APPOINTMENT_MUTATION, {
    onCompleted: () => refetch(),
  });
  const [rescheduleAppointment, { loading: rescheduling }] = useMutation(
    RESCHEDULE_APPOINTMENT_MUTATION,
    {
      onCompleted: () => {
        setRescheduleId(null);
        setRescheduleAt('');
        refetch();
      },
      onError: (err) => setListError(err.message),
    },
  );

  const allAppointments: Appt[] = data?.appointments ?? [];

  const appointments = useMemo(() => {
    if (view === 'day') return allAppointments;
    const start = new Date(weekStart + 'T00:00:00');
    const end = new Date(addDays(weekStart, 7) + 'T00:00:00');
    return allAppointments.filter((a) => {
      const t = new Date(a.scheduledAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
  }, [allAppointments, view, weekStart]);

  const countsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const day of weekDays) map[day] = 0;
    for (const a of appointments) {
      const key = new Date(a.scheduledAt).toISOString().slice(0, 10);
      if (key in map) map[key] += 1;
    }
    return map;
  }, [appointments, weekDays]);

  const handleStatus = async (id: string, status: string) => {
    setListError('');
    try {
      if (status === 'cancelled') {
        await cancelAppointment({ variables: { input: { id }, hospitalId } });
        return;
      }
      await updateStatus({ variables: { id, status, hospitalId } });
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <div>
      <DashboardHeader
        title="Appointments"
        subtitle={
          view === 'week'
            ? `Week of ${new Date(weekStart + 'T12:00:00').toLocaleDateString()}`
            : new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
        }
      />

      {(listError || error) ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">
          {listError || error?.message}
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-clay-text">
            Date
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-2xl border border-white/60 bg-clay-surface px-3 py-2 shadow-clay-inset"
            />
          </label>
          <div className="flex rounded-2xl bg-clay-surface p-1 shadow-clay-sm">
            <button
              type="button"
              className={`rounded-xl px-3 py-1.5 text-sm ${view === 'day' ? 'bg-clay-primary-light text-clay-primary' : 'text-clay-text-muted'}`}
              onClick={() => setView('day')}
            >
              Day
            </button>
            <button
              type="button"
              className={`rounded-xl px-3 py-1.5 text-sm ${view === 'week' ? 'bg-clay-primary-light text-clay-primary' : 'text-clay-text-muted'}`}
              onClick={() => setView('week')}
            >
              Week
            </button>
          </div>
        </div>
        <Link href="/appointments/new">
          <ClayButton>
            <Plus className="h-4 w-4" />
            New Appointment
          </ClayButton>
        </Link>
      </div>

      {view === 'week' ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-7">
          {weekDays.map((date) => {
            const count = countsByDay[date] ?? 0;
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  setSelectedDate(date);
                  setView('day');
                }}
                className={`rounded-2xl p-3 text-left shadow-clay-sm ${
                  isSelected ? 'bg-clay-primary-light text-clay-primary' : 'bg-clay-surface'
                }`}
              >
                <p className="text-xs text-clay-text-muted">
                  {new Date(date + 'T12:00:00').toLocaleDateString(undefined, {
                    weekday: 'short',
                  })}
                </p>
                <p className="text-lg font-semibold">
                  {new Date(date + 'T12:00:00').getDate()}
                </p>
                <p className="text-xs">
                  {count} appt{count === 1 ? '' : 's'}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading appointments...</p>
        ) : appointments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
            <p className="text-clay-text-muted">
              No appointments scheduled for{' '}
              {view === 'week'
                ? 'this week'
                : selectedDate === todayDateString()
                  ? 'today'
                  : new Date(selectedDate + 'T12:00:00').toLocaleDateString()}
              .
            </p>
            <Link
              href="/appointments/new"
              className="mt-3 inline-block text-sm text-clay-primary hover:underline"
            >
              Schedule one now
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-clay-primary-light/20"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-clay-primary-light text-clay-primary shadow-clay-inset">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-clay-text">
                    {new Date(appt.scheduledAt).toLocaleString([], {
                      weekday: view === 'week' ? 'short' : undefined,
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    — {appt.patient?.fullName ?? 'Unknown patient'}
                  </p>
                  <p className="text-sm text-clay-text-muted">
                    {appt.doctor?.fullName ? `Dr. ${appt.doctor.fullName}` : 'No doctor assigned'}
                    {appt.reason ? ` · ${appt.reason}` : ''}
                  </p>
                </div>
                <ClayBadge variant={statusVariant(appt.status)}>
                  {appt.status.replace(/_/g, ' ')}
                </ClayBadge>
                {appt.status === 'scheduled' || appt.status === 'checked_in' ? (
                  <ClayButton
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setRescheduleId(appt.id);
                      setRescheduleAt(new Date(appt.scheduledAt).toISOString().slice(0, 16));
                    }}
                  >
                    Reschedule
                  </ClayButton>
                ) : null}
                {appt.status === 'scheduled' ? (
                  <div className="flex gap-2">
                    <ClayButton
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatus(appt.id, 'checked_in')}
                    >
                      Check In
                    </ClayButton>
                    <ClayButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStatus(appt.id, 'cancelled')}
                    >
                      Cancel
                    </ClayButton>
                  </div>
                ) : null}
                {appt.status === 'checked_in' ? (
                  <ClayButton size="sm" onClick={() => handleStatus(appt.id, 'completed')}>
                    Complete
                  </ClayButton>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ClayCard>

      {rescheduleId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <ClayCard className="w-full max-w-md">
            <h2 className="mb-4 text-lg font-semibold text-clay-text">Reschedule appointment</h2>
            <ClayInput
              label="New date & time"
              type="datetime-local"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <ClayButton type="button" variant="ghost" onClick={() => setRescheduleId(null)}>
                Cancel
              </ClayButton>
              <ClayButton
                type="button"
                isLoading={rescheduling}
                onClick={() => {
                  if (!rescheduleAt) return;
                  void rescheduleAppointment({
                    variables: {
                      hospitalId,
                      input: {
                        id: rescheduleId,
                        scheduledAt: new Date(rescheduleAt).toISOString(),
                      },
                    },
                  });
                }}
              >
                Save
              </ClayButton>
            </div>
          </ClayCard>
        </div>
      ) : null}
    </div>
  );
}
