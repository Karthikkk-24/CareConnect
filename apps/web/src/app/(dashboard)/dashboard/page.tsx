'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Calendar, UserCog, Users, Activity } from 'lucide-react';
import { ClayCard, ClayStatCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  ACTIVE_ADMISSIONS_QUERY,
  APPOINTMENTS_QUERY,
  DASHBOARD_STATS_QUERY,
  ME_QUERY,
  PATIENTS_QUERY,
  STAFF_MEMBERS_QUERY,
} from '@/lib/graphql/queries';

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const today = todayDateString();
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data: staffData } = useQuery(STAFF_MEMBERS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });
  const { data: patientsData } = useQuery(PATIENTS_QUERY, {
    variables: { page: 1, limit: 1, hospitalId },
    skip: !hospitalId,
  });

  const { data: statsData } = useQuery(DASHBOARD_STATS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
    errorPolicy: 'ignore',
  });

  const { data: appointmentsData } = useQuery(APPOINTMENTS_QUERY, {
    variables: { hospitalId, date: today },
    skip: !hospitalId || !!statsData?.dashboardStats,
    errorPolicy: 'ignore',
  });

  const { data: admissionsData } = useQuery(ACTIVE_ADMISSIONS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId || !!statsData?.dashboardStats,
    errorPolicy: 'ignore',
  });

  const staffCount = staffData?.staffMembers?.length ?? 0;
  const patientCount = patientsData?.patients?.total ?? 0;

  const appointmentsToday =
    statsData?.dashboardStats?.appointmentsToday ??
    appointmentsData?.appointments?.length ??
    '—';

  const activeAdmissions =
    statsData?.dashboardStats?.activeAdmissions ??
    admissionsData?.activeAdmissions?.length ??
    '—';

  const hasAppointments = typeof appointmentsToday === 'number' && appointmentsToday > 0;

  return (
    <div>
      <DashboardHeader
        title="Dashboard"
        subtitle="Overview of your hospital operations"
      />

      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <ClayStatCard title="Total Patients" value={patientCount} icon={<Users className="h-5 w-5" />} />
        <ClayStatCard title="Staff Members" value={staffCount} icon={<UserCog className="h-5 w-5" />} />
        <ClayStatCard
          title="Appointments Today"
          value={appointmentsToday}
          icon={<Calendar className="h-5 w-5" />}
        />
        <ClayStatCard
          title="Active Admissions"
          value={activeAdmissions}
          icon={<Activity className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Register Patient', href: '/patients/new' },
              { label: 'Bulk Import Patients', href: '/patients/import' },
              { label: 'New Appointment', href: '/appointments/new' },
              { label: 'View Appointments', href: '/appointments' },
              { label: 'Admit Patient', href: '/admissions' },
              { label: 'Add Staff Member', href: '/staff/new' },
              { label: 'View Staff Directory', href: '/staff' },
              { label: 'Lab Queue', href: '/lab' },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-2xl bg-clay-primary-light px-4 py-3 text-sm font-medium text-clay-primary shadow-clay-inset transition hover:bg-clay-primary/10"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </ClayCard>

        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Getting Started</h2>
          <ul className="space-y-3">
            {[
              { done: !!meData?.me?.onboardingCompleted, text: 'Complete onboarding' },
              { done: staffCount > 0, text: 'Add your first staff member' },
              { done: patientCount > 0, text: 'Register your first patient' },
              { done: hasAppointments, text: 'Set up appointment scheduling (Phase 3)' },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    item.done
                      ? 'bg-clay-success/20 text-clay-success'
                      : 'bg-clay-primary-light text-clay-text-muted'
                  }`}
                >
                  {item.done ? '✓' : '○'}
                </span>
                <span className={item.done ? 'text-clay-text-muted line-through' : 'text-clay-text'}>
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </ClayCard>
      </div>
    </div>
  );
}
