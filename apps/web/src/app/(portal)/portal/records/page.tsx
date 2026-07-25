'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useAuth } from '@clerk/nextjs';
import { FileText } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PORTAL_PATIENT_RECORDS_QUERY } from '@/lib/graphql/queries';
import { openAuthenticatedUpload } from '@/lib/open-authenticated-upload';

export default function PortalRecordsPage() {
  const { getToken } = useAuth();
  const { data, loading, error } = useQuery(PORTAL_PATIENT_RECORDS_QUERY);
  const [docError, setDocError] = useState('');
  const patient = data?.portalPatientRecords?.patient;
  const appointments = data?.portalPatientRecords?.appointments ?? [];
  const prescriptions = data?.portalPatientRecords?.prescriptions ?? [];
  const labResults = data?.portalPatientRecords?.labResults ?? [];
  const documents = data?.portalPatientRecords?.documents ?? [];

  return (
    <div>
      <DashboardHeader
        title="Medical Records"
        subtitle="Summary of your care history and documents"
      />

      {(error || docError) ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">
          {docError || error?.message}
        </p>
      ) : null}

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
              <div className="flex items-center justify-between">
                <span className="text-clay-text-muted">Documents</span>
                <ClayBadge>{documents.length}</ClayBadge>
              </div>
            </div>
          </ClayCard>

          <ClayCard className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-clay-text">Documents</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-clay-text-muted">No documents shared yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {documents.map(
                  (d: {
                    id: string;
                    name: string;
                    fileUrl: string;
                    documentType?: string;
                  }) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 rounded-2xl bg-clay-primary-light/30 p-3"
                    >
                      <FileText className="h-5 w-5 shrink-0 text-clay-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-clay-text">{d.name}</p>
                        {d.documentType ? (
                          <p className="text-xs text-clay-text-muted">
                            {d.documentType.replace(/_/g, ' ')}
                          </p>
                        ) : null}
                      </div>
                      <ClayButton
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setDocError('');
                          void openAuthenticatedUpload(d.fileUrl, getToken).catch(
                            (err: unknown) =>
                              setDocError(
                                err instanceof Error ? err.message : 'Download failed',
                              ),
                          );
                        }}
                      >
                        Open
                      </ClayButton>
                    </div>
                  ),
                )}
              </div>
            )}
          </ClayCard>
        </div>
      )}
    </div>
  );
}
