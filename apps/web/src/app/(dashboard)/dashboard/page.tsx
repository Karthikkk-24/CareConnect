'use client';

import { useQuery } from '@apollo/client';
import { Calendar, UserCog, Users, Activity } from 'lucide-react';
import { ClayCard, ClayStatCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { ME_QUERY, STAFF_MEMBERS_QUERY } from '@/lib/graphql/queries';

export default function DashboardPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const { data: staffData } = useQuery(STAFF_MEMBERS_QUERY, {
    variables: { hospitalId: meData?.me?.hospitalId },
    skip: !meData?.me?.hospitalId,
  });

  const staffCount = staffData?.staffMembers?.length ?? 0;

  return (
    <div>
      <DashboardHeader
        title="Dashboard"
        subtitle="Overview of your hospital operations"
      />

      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <ClayStatCard title="Total Patients" value="—" icon={<Users className="h-5 w-5" />} trend={{ value: 'Phase 2', positive: true }} />
        <ClayStatCard title="Staff Members" value={staffCount} icon={<UserCog className="h-5 w-5" />} />
        <ClayStatCard title="Appointments Today" value="—" icon={<Calendar className="h-5 w-5" />} />
        <ClayStatCard title="Active Admissions" value="—" icon={<Activity className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Add Staff Member', href: '/staff/new' },
              { label: 'View Staff Directory', href: '/staff' },
              { label: 'Hospital Settings', href: '/dashboard/hospital' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="rounded-2xl bg-clay-primary-light px-4 py-3 text-sm font-medium text-clay-primary shadow-clay-inset transition hover:bg-clay-primary/10"
              >
                {action.label}
              </a>
            ))}
          </div>
        </ClayCard>

        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Getting Started</h2>
          <ul className="space-y-3">
            {[
              { done: !!meData?.me?.onboardingCompleted, text: 'Complete onboarding' },
              { done: staffCount > 0, text: 'Add your first staff member' },
              { done: false, text: 'Register your first patient (Phase 2)' },
              { done: false, text: 'Set up appointment scheduling (Phase 3)' },
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
