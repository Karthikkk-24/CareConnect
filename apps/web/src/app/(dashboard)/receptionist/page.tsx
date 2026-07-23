'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Calendar, Users, BedDouble, UserPlus } from 'lucide-react';
import { ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  ACTIVE_ADMISSIONS_QUERY,
  APPOINTMENTS_QUERY,
  ME_QUERY,
  PATIENTS_QUERY,
} from '@/lib/graphql/queries';

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReceptionistHomePage() {
  const today = todayDateString();
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data: appointmentsData, loading: apptsLoading } = useQuery(APPOINTMENTS_QUERY, {
    variables: { hospitalId, date: today },
    skip: !hospitalId,
  });
  const { data: patientsData } = useQuery(PATIENTS_QUERY, {
    variables: { page: 1, limit: 1, hospitalId },
    skip: !hospitalId,
  });
  const { data: admissionsData } = useQuery(ACTIVE_ADMISSIONS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const appointments = appointmentsData?.appointments ?? [];
  const links = [
    { label: 'Register patient', href: '/patients/new', icon: UserPlus },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Schedule appointment', href: '/appointments/new', icon: Calendar },
    { label: 'Today’s appointments', href: '/appointments', icon: Calendar },
    { label: 'Admissions', href: '/admissions', icon: BedDouble },
  ];

  return (
    <div>
      <DashboardHeader
        title="Front Desk"
        subtitle={`Welcome, ${meData?.me?.fullName ?? 'Reception'} — ${new Date().toLocaleDateString()}`}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <ClayCard className="text-center">
          <p className="text-3xl font-bold text-clay-primary">
            {apptsLoading ? '—' : appointments.length}
          </p>
          <p className="text-sm text-clay-text-muted">Appointments Today</p>
        </ClayCard>
        <ClayCard className="text-center">
          <p className="text-3xl font-bold text-clay-primary">
            {patientsData?.patients?.total ?? '—'}
          </p>
          <p className="text-sm text-clay-text-muted">Registered Patients</p>
        </ClayCard>
        <ClayCard className="text-center">
          <p className="text-3xl font-bold text-clay-warning">
            {admissionsData?.activeAdmissions?.length ?? '—'}
          </p>
          <p className="text-sm text-clay-text-muted">Active Admissions</p>
        </ClayCard>
      </div>

      <ClayCard>
        <h2 className="mb-4 text-lg font-semibold text-clay-text">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(({ label, href, icon: Icon }) => (
            <Link
              key={href + label}
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
  );
}
