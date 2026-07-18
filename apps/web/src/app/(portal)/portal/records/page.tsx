'use client';

import { useQuery } from '@apollo/client';
import { FileText } from 'lucide-react';
import { ClayBadge, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PORTAL_PATIENT_RECORDS_QUERY } from '@/lib/graphql/queries';

export default function PortalRecordsPage() {
  const { data, loading } = useQuery(PORTAL_PATIENT_RECORDS_QUERY);
  const patient = data?.portalPatientRecords?.patient;
  const appointments = data?.portalPatientRecords?.appointments ?? [];
  const prescriptions = data?.portalPatientRecords?.prescriptions ?? [];
  const labResults = data?.portalPatientRecords?.labResults ?? [];

  return (
    <div>
      <DashboardHeader
        title="Medical Records"
        subtitle="Read-only summary of your care history"
      />

      {loading ? (
        <p className="text-clay-text-muted">Loading records...</p>
      ) : !patient ? (
        <ClayCard>
          <p className="text-clay-text-muted">No linked patient record found.</p>
        </ClayCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ClayCard>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-clay-text">
              <FileText className="h-5 w-5 text-clay-primary" />
              Profile Summary
            </h2>
            <dl className="grid gap-3 text-sm">
              {[
                ['Status', patient.status],
                ['Date of Birth', patient.dateOfBirth],
                ['Gender', patient.gender],
                ['Blood Group', patient.bloodGroup],
                ['Email', patient.email],
                ['Phone', patient.phone],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-4">
                  <dt className="text-clay-text-muted">{label}</dt>
                  <dd className="text-clay-text">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </ClayCard>

          <ClayCard>
            <h2 className="mb-4 text-lg font-semibold text-clay-text">Care Activity</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-clay-text-muted">Total appointments</span>
                <ClayBadge>{appointments.length}</ClayBadge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-clay-text-muted">Prescriptions</span>
                <ClayBadge>{prescriptions.length}</ClayBadge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-clay-text-muted">Lab results</span>
                <ClayBadge>{labResults.length}</ClayBadge>
              </div>
            </div>
          </ClayCard>
        </div>
      )}
    </div>
  );
}
