'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Calendar, Clock, FileText, FlaskConical, Users } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { QueryError } from '@/components/query-error';
import { APPOINTMENTS_QUERY, LIST_PAGE_LIMIT, ME_QUERY } from '@/lib/graphql/queries';
import { localDateISO } from '@/lib/local-date';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DoctorDashboardPage() {
  const today = localDateISO();
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const doctorId = meData?.me?.id;
  const canWriteAppointments = (meData?.me?.permissions ?? []).includes('appointments:write');

  const { data, loading, error, refetch } = useQuery(APPOINTMENTS_QUERY, {
    variables: {
      hospitalId,
      date: today,
      doctorId,
      pagination: { page: 1, limit: LIST_PAGE_LIMIT },
    },
    skip: !hospitalId || !doctorId,
  });

  const appointments = data?.appointments?.items ?? [];
  const pending = appointments.filter(
    (a: { status: string }) => a.status === 'scheduled' || a.status === 'checked_in',
  );

  const quickLinks = [
    { label: 'All Appointments', href: '/appointments', icon: Calendar },
    ...(canWriteAppointments
      ? [{ label: 'New Appointment', href: '/appointments/new', icon: Calendar }]
      : []),
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Admissions', href: '/admissions', icon: FileText },
    { label: 'Order Lab', href: '/lab', icon: FlaskConical },
  ];

  return (
    <div>
      <DashboardHeader
        title="Doctor Dashboard"
        subtitle={`Welcome, Dr. ${meData?.me?.fullName ?? 'Doctor'} — ${new Date().toLocaleDateString()}`}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <ClayCard className="text-center">
          <p className="text-3xl font-bold text-clay-primary">
            {loading || error ? '—' : appointments.length}
          </p>
          <p className="text-sm text-clay-text-muted">Appointments Today</p>
        </ClayCard>
        <ClayCard className="text-center">
          <p className="text-3xl font-bold text-clay-warning">
            {loading || error ? '—' : pending.length}
          </p>
          <p className="text-sm text-clay-text-muted">Pending / In Progress</p>
        </ClayCard>
        <ClayCard className="text-center">
          <p className="text-3xl font-bold text-clay-success">
            {loading || error
              ? '—'
              : appointments.filter((a: { status: string }) => a.status === 'completed').length}
          </p>
          <p className="text-sm text-clay-text-muted">Completed</p>
        </ClayCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Today&apos;s Appointments</h2>
          {loading ? (
            <p className="text-sm text-clay-text-muted">Loading...</p>
          ) : error ? (
            <QueryError
              message="We could not load appointments. Please try again."
              onRetry={() => void refetch()}
            />
          ) : appointments.length === 0 ? (
            <p className="text-sm text-clay-text-muted">No appointments today.</p>
          ) : (
            <div className="space-y-3">
              {appointments.map(
                (appt: {
                  id: string;
                  scheduledAt: string;
                  status: string;
                  reason?: string;
                  patient?: { id: string; fullName: string };
                }) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 rounded-2xl bg-clay-primary-light/30 p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-surface shadow-clay-inset">
                      <Clock className="h-4 w-4 text-clay-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-clay-text">
                        {formatTime(appt.scheduledAt)} — {appt.patient?.fullName}
                      </p>
                      <p className="truncate text-xs text-clay-text-muted">{appt.reason ?? 'No reason'}</p>
                    </div>
                    <ClayBadge>{appt.status.replace(/_/g, ' ')}</ClayBadge>
                    {appt.patient?.id ? (
                      <Link href={`/patients/${appt.patient.id}`}>
                        <ClayButton size="sm" variant="secondary">
                          Chart
                        </ClayButton>
                      </Link>
                    ) : null}
                  </div>
                ),
              )}
            </div>
          )}
        </ClayCard>

        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Quick Links</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-2xl bg-clay-primary-light px-4 py-3 text-sm font-medium text-clay-primary shadow-clay-inset transition hover:bg-clay-primary/10"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
