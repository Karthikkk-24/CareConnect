'use client';

import { useQuery } from '@apollo/client';
import { ClayBadge, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PortalQueryError } from '@/components/portal/portal-query-error';
import { ME_QUERY, PORTAL_PATIENT_RECORDS_QUERY } from '@/lib/graphql/queries';

export default function PortalProfilePage() {
  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading, error, refetch } = useQuery(PORTAL_PATIENT_RECORDS_QUERY);
  const patient = data?.portalPatientRecords?.patient;

  return (
    <div>
      <DashboardHeader
        title="My Profile"
        subtitle="Your account and patient record details"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Account</h2>
          <dl className="grid gap-3 text-sm">
            {[
              ['Name', meData?.me?.fullName],
              ['Email', meData?.me?.email],
              ['Role', meData?.me?.roles?.[0]?.replace(/_/g, ' ')],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between gap-4">
                <dt className="text-clay-text-muted">{label}</dt>
                <dd className="text-clay-text">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </ClayCard>

        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Patient Record</h2>
          {loading ? (
            <p className="text-sm text-clay-text-muted">Loading profile...</p>
          ) : error ? (
            <PortalQueryError
      onRetry={() => refetch()}
            />
          ) : !patient ? (
            <p className="text-sm text-clay-text-muted">
              No patient record is linked to this account yet. Your hospital can link your profile
              by email or user ID.
            </p>
          ) : (
            <dl className="grid gap-3 text-sm">
              {[
                ['Full Name', patient.fullName],
                ['Email', patient.email],
                ['Phone', patient.phone],
                ['Date of Birth', patient.dateOfBirth],
                ['Gender', patient.gender],
                ['Blood Group', patient.bloodGroup],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-4">
                  <dt className="text-clay-text-muted">{label}</dt>
                  <dd className="text-clay-text">{value || '—'}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4">
                <dt className="text-clay-text-muted">Status</dt>
                <dd>
                  <ClayBadge>{patient.status}</ClayBadge>
                </dd>
              </div>
            </dl>
          )}
        </ClayCard>
      </div>
    </div>
  );
}
