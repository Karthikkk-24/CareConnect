'use client';

import { useQuery } from '@apollo/client';
import { Calendar } from 'lucide-react';
import { ClayBadge, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PortalQueryError } from '@/components/portal/portal-query-error';
import { PORTAL_PATIENT_RECORDS_QUERY } from '@/lib/graphql/queries';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'cancelled':
    case 'no_show':
      return 'error' as const;
    case 'checked_in':
      return 'info' as const;
    default:
      return 'default' as const;
  }
};

export default function PortalAppointmentsPage() {
  const { data, loading, error, refetch } = useQuery(PORTAL_PATIENT_RECORDS_QUERY);
  const appointments = data?.portalPatientRecords?.appointments ?? [];
  const patient = data?.portalPatientRecords?.patient;

  return (
    <div>
      <DashboardHeader
        title="My Appointments"
        subtitle={patient ? `Appointments for ${patient.fullName}` : 'Your scheduled visits'}
      />

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading appointments...</p>
        ) : error ? (
          <div className="px-6 py-8">
            <PortalQueryError
              message={error.message || 'We could not load your appointments.'}
              onRetry={() => refetch()}
            />
          </div>
        ) : !patient ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">
            No linked patient record found.
          </p>
        ) : appointments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
            <p className="text-clay-text-muted">No appointments on record.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {appointments.map(
              (appt: {
                id: string;
                scheduledAt: string;
                reason?: string;
                status: string;
                notes?: string;
              }) => (
                <div key={appt.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-clay-text">{formatDateTime(appt.scheduledAt)}</p>
                      {appt.reason ? (
                        <p className="text-sm text-clay-text-muted">{appt.reason}</p>
                      ) : null}
                      {appt.notes ? (
                        <p className="mt-1 text-sm text-clay-text-muted">{appt.notes}</p>
                      ) : null}
                    </div>
                    <ClayBadge variant={statusVariant(appt.status)}>
                      {appt.status.replace(/_/g, ' ')}
                    </ClayBadge>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
