'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Calendar, Clock } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  APPOINTMENTS_QUERY,
  CANCEL_APPOINTMENT_MUTATION,
  ME_QUERY,
  UPDATE_APPOINTMENT_STATUS_MUTATION,
} from '@/lib/graphql/queries';

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const { data: meData } = useQuery(ME_QUERY);
  const me = meData?.me;
  const hospitalId = me?.hospitalId;
  const isDoctorOnly =
    Array.isArray(me?.roles) &&
    me.roles.includes('doctor') &&
    !me.roles.some((r: string) =>
      ['hospital_admin', 'hospital_manager', 'super_admin', 'receptionist', 'nurse'].includes(r),
    );

  const { data, loading, refetch } = useQuery(APPOINTMENTS_QUERY, {
    variables: {
      hospitalId,
      date: selectedDate,
      ...(isDoctorOnly && me?.id ? { doctorId: me.id } : {}),
    },
    skip: !hospitalId,
  });

  const [updateStatus] = useMutation(UPDATE_APPOINTMENT_STATUS_MUTATION, {
    onCompleted: () => refetch(),
  });
  const [cancelAppointment] = useMutation(CANCEL_APPOINTMENT_MUTATION, {
    onCompleted: () => refetch(),
  });

  const appointments = data?.appointments ?? [];

  const handleStatus = async (id: string, status: string) => {
    if (status === 'cancelled') {
      await cancelAppointment({
        variables: { input: { id }, hospitalId },
      });
      return;
    }
    await updateStatus({ variables: { id, status, hospitalId } });
  };

  return (
    <div>
      <DashboardHeader
        title="Appointments"
        subtitle={new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-clay-text">
          Date
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-2xl border border-white/60 bg-clay-surface px-3 py-2 shadow-clay-inset"
          />
        </label>
        <Link href="/appointments/new">
          <ClayButton>
            <Plus className="h-4 w-4" />
            New Appointment
          </ClayButton>
        </Link>
      </div>

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading appointments...</p>
        ) : appointments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
            <p className="text-clay-text-muted">No appointments scheduled for today.</p>
            <Link href="/appointments/new" className="mt-3 inline-block text-sm text-clay-primary hover:underline">
              Schedule one now
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {appointments.map(
              (appt: {
                id: string;
                scheduledAt: string;
                reason?: string;
                status: string;
                patient?: { fullName: string };
                doctor?: { fullName: string };
              }) => (
                <div
                  key={appt.id}
                  className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-clay-primary-light/20"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-clay-primary-light text-clay-primary shadow-clay-inset">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-clay-text">
                      {formatTime(appt.scheduledAt)} — {appt.patient?.fullName ?? 'Unknown patient'}
                    </p>
                    <p className="text-sm text-clay-text-muted">
                      {appt.doctor?.fullName ? `Dr. ${appt.doctor.fullName}` : 'No doctor assigned'}
                      {appt.reason ? ` · ${appt.reason}` : ''}
                    </p>
                  </div>
                  <ClayBadge variant={statusVariant(appt.status)}>
                    {appt.status.replace(/_/g, ' ')}
                  </ClayBadge>
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
              ),
            )}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
