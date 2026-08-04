'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Activity, HeartPulse, BedDouble, Users } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { QueryError } from '@/components/query-error';
import { ACTIVE_ADMISSIONS_QUERY, ME_QUERY } from '@/lib/graphql/queries';

export default function NurseDashboardPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data, loading, error, refetch } = useQuery(ACTIVE_ADMISSIONS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const admissions = data?.activeAdmissions ?? [];

  const quickLinks = [
    { label: 'Record Vitals', href: '/patients', icon: HeartPulse },
    { label: 'All Admissions', href: '/admissions', icon: Activity },
    { label: 'Bed Occupancy', href: '/admissions/occupancy', icon: BedDouble },
    { label: 'Patients', href: '/patients', icon: Users },
  ];

  return (
    <div>
      <DashboardHeader
        title="Nurse Dashboard"
        subtitle={`Active care overview — ${meData?.me?.fullName ?? 'Nurse'}`}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <ClayCard className="text-center">
          <p className="text-3xl font-bold text-clay-primary">
            {loading || error ? '—' : admissions.length}
          </p>
          <p className="text-sm text-clay-text-muted">Active Admissions</p>
        </ClayCard>
        <ClayCard className="text-center">
          <p className="text-3xl font-bold text-clay-warning">
            {loading || error
              ? '—'
              : admissions.filter((a: { bed?: { label: string } }) => !a.bed?.label).length}
          </p>
          <p className="text-sm text-clay-text-muted">Unassigned Beds</p>
        </ClayCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Active Admissions</h2>
          {loading ? (
            <p className="text-sm text-clay-text-muted">Loading...</p>
          ) : error ? (
            <QueryError
              message="We could not load admissions. Please try again."
              onRetry={() => void refetch()}
            />
          ) : admissions.length === 0 ? (
            <p className="text-sm text-clay-text-muted">No active admissions.</p>
          ) : (
            <div className="space-y-3">
              {admissions.map(
                (adm: {
                  id: string;
                  patient?: { id: string; fullName: string };
                  ward?: { name: string };
                  bed?: { label: string };
                  admittedAt: string;
                  reason?: string;
                }) => (
                  <div
                    key={adm.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl bg-clay-primary-light/30 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-clay-text">{adm.patient?.fullName}</p>
                      <p className="text-xs text-clay-text-muted">
                        {[adm.ward?.name, adm.bed?.label].filter(Boolean).join(' · ') || 'No bed assigned'}
                        {' · '}
                        {new Date(adm.admittedAt).toLocaleDateString()}
                      </p>
                      {adm.reason ? (
                        <p className="mt-1 text-xs text-clay-text-muted">{adm.reason}</p>
                      ) : null}
                    </div>
                    <ClayBadge variant="success">active</ClayBadge>
                    {adm.patient?.id ? (
                      <Link href={`/patients/${adm.patient.id}`}>
                        <ClayButton size="sm">
                          <HeartPulse className="h-4 w-4" />
                          Vitals
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
          <div className="grid gap-3">
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
