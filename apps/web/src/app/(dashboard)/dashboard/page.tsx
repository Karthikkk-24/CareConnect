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
import { canAccessRoute } from '@/lib/route-access';

const QUICK_ACTIONS = [
  { label: 'Register Patient', href: '/patients/new', anyPermissions: ['patients:write'] },
  { label: 'Bulk Import Patients', href: '/patients/import', anyPermissions: ['patients:write'] },
  { label: 'New Appointment', href: '/appointments/new', anyPermissions: ['appointments:write'] },
  { label: 'View Appointments', href: '/appointments' },
  { label: 'Admit Patient', href: '/admissions', anyPermissions: ['patients:write'], anyRoles: ['doctor', 'nurse', 'receptionist', 'hospital_admin', 'hospital_manager'] },
  { label: 'Add Staff Member', href: '/staff/new', anyPermissions: ['staff:write'] },
  { label: 'View Staff Directory', href: '/staff' },
  { label: 'Lab Queue', href: '/lab' },
] as const;

function canSeeQuickAction(
  action: (typeof QUICK_ACTIONS)[number],
  access: { roles: string[]; permissions: string[] },
): boolean {
  if (!canAccessRoute(action.href, access)) return false;
  if ('anyRoles' in action && action.anyRoles) {
    const hasRole =
      access.roles.includes('super_admin') ||
      action.anyRoles.some((role) => access.roles.includes(role));
    if (!hasRole) return false;
  }
  if ('anyPermissions' in action && action.anyPermissions) {
    return action.anyPermissions.some((perm) => access.permissions.includes(perm));
  }
  return true;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const today = todayDateString();
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const me = meData?.me;
  const isDoctorOnly =
    Array.isArray(me?.roles) &&
    me.roles.includes('doctor') &&
    !me.roles.some((r: string) =>
      ['hospital_admin', 'hospital_manager', 'super_admin', 'receptionist', 'nurse'].includes(r),
    );

  const { data: staffData, error: staffError } = useQuery(STAFF_MEMBERS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId || !(me?.permissions ?? []).includes('staff:read'),
  });
  const { data: patientsData, error: patientsError } = useQuery(PATIENTS_QUERY, {
    variables: { page: 1, limit: 1, hospitalId },
    skip: !hospitalId || !(me?.permissions ?? []).includes('patients:read'),
  });

  const { data: statsData, error: statsError } = useQuery(DASHBOARD_STATS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId || !(me?.permissions ?? []).includes('reports:read'),
  });

  const { data: appointmentsData } = useQuery(APPOINTMENTS_QUERY, {
    variables: {
      hospitalId,
      date: today,
      ...(isDoctorOnly && me?.id ? { doctorId: me.id } : {}),
    },
    skip: !hospitalId || !!statsData?.dashboardStats,
  });

  const { data: admissionsData } = useQuery(ACTIVE_ADMISSIONS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId || !!statsData?.dashboardStats,
  });

  const canReadStaff = (me?.permissions ?? []).includes('staff:read');
  const canReadPatients = (me?.permissions ?? []).includes('patients:read');
  const staffCount = canReadStaff
    ? staffError
      ? '—'
      : (staffData?.staffMembers?.length ?? 0)
    : '—';
  const patientCount = canReadPatients
    ? patientsError
      ? '—'
      : (patientsData?.patients?.total ?? 0)
    : '—';

  const appointmentsToday =
    statsError && !appointmentsData
      ? '—'
      : (statsData?.dashboardStats?.appointmentsToday ??
        appointmentsData?.appointments?.length ??
        '—');

  const activeAdmissions =
    statsError && !admissionsData
      ? '—'
      : (statsData?.dashboardStats?.activeAdmissions ??
        admissionsData?.activeAdmissions?.length ??
        '—');

  const hasAppointments = typeof appointmentsToday === 'number' && appointmentsToday > 0;
  const hasStaff = typeof staffCount === 'number' && staffCount > 0;
  const hasPatients = typeof patientCount === 'number' && patientCount > 0;

  const access = {
    roles: me?.roles ?? [],
    permissions: me?.permissions ?? [],
  };
  const visibleQuickActions = QUICK_ACTIONS.filter((action) => canSeeQuickAction(action, access));

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
            {visibleQuickActions.map((action) => (
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
              { done: hasStaff, text: 'Add your first staff member' },
              { done: hasPatients, text: 'Register your first patient' },
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
