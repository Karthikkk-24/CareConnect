'use client';

import { useQuery } from '@apollo/client';
import { Pill } from 'lucide-react';
import { ClayBadge, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PortalQueryError } from '@/components/portal/portal-query-error';
import { PORTAL_PATIENT_RECORDS_QUERY } from '@/lib/graphql/queries';

export default function PortalPrescriptionsPage() {
  const { data, loading, error, refetch } = useQuery(PORTAL_PATIENT_RECORDS_QUERY);
  const patient = data?.portalPatientRecords?.patient;
  const prescriptions = data?.portalPatientRecords?.prescriptions ?? [];

  return (
    <div>
      <DashboardHeader
        title="Prescriptions"
        subtitle="Medications prescribed during your care"
      />

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading prescriptions...</p>
        ) : error ? (
          <div className="px-6 py-8">
            <PortalQueryError
              message={error.message || 'We could not load your prescriptions.'}
              onRetry={() => refetch()}
            />
          </div>
        ) : !patient ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">
            No linked patient record found.
          </p>
        ) : prescriptions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Pill className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
            <p className="text-clay-text-muted">No prescriptions on record.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {prescriptions.map(
              (rx: {
                id: string;
                status: string;
                notes?: string;
                createdAt: string;
                items: Array<{
                  id: string;
                  drugName: string;
                  dosage?: string;
                  frequency?: string;
                  duration?: string;
                  instructions?: string;
                }>;
              }) => (
                <div key={rx.id} className="px-6 py-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-clay-text">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </p>
                    <ClayBadge>{rx.status}</ClayBadge>
                  </div>
                  {rx.notes ? <p className="mb-3 text-sm text-clay-text-muted">{rx.notes}</p> : null}
                  <ul className="space-y-2">
                    {rx.items.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-2xl bg-clay-primary-light/30 px-4 py-3 text-sm"
                      >
                        <p className="font-medium text-clay-text">{item.drugName}</p>
                        <p className="text-clay-text-muted">
                          {[item.dosage, item.frequency, item.duration].filter(Boolean).join(' · ')}
                        </p>
                        {item.instructions ? (
                          <p className="mt-1 text-clay-text-muted">{item.instructions}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
