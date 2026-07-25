'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Calendar } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  PORTAL_BOOK_APPOINTMENT_MUTATION,
  PORTAL_CANCEL_APPOINTMENT_MUTATION,
  PORTAL_PATIENT_RECORDS_QUERY,
} from '@/lib/graphql/queries';

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
  const { data, loading, refetch, error } = useQuery(PORTAL_PATIENT_RECORDS_QUERY);
  const appointments = data?.portalPatientRecords?.appointments ?? [];
  const patient = data?.portalPatientRecords?.patient;

  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  const [book, { loading: booking }] = useMutation(PORTAL_BOOK_APPOINTMENT_MUTATION, {
    onCompleted: () => {
      setScheduledAt('');
      setReason('');
      refetch();
    },
    onError: (err) => setFormError(err.message),
  });
  const [cancelAppt] = useMutation(PORTAL_CANCEL_APPOINTMENT_MUTATION, {
    onCompleted: () => refetch(),
    onError: (err) => setFormError(err.message),
  });

  return (
    <div>
      <DashboardHeader
        title="My Appointments"
        subtitle={patient ? `Appointments for ${patient.fullName}` : 'Your scheduled visits'}
      />

      {(formError || error) ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">
          {formError || error?.message}
        </p>
      ) : null}

      {patient ? (
        <ClayCard className="mb-6 max-w-lg">
          <h2 className="mb-3 text-lg font-semibold text-clay-text">Book an appointment</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setFormError('');
              if (!scheduledAt) {
                setFormError('Choose a date and time');
                return;
              }
              void book({
                variables: {
                  input: {
                    scheduledAt: new Date(scheduledAt).toISOString(),
                    reason: reason.trim() || undefined,
                  },
                },
              });
            }}
          >
            <ClayInput
              label="Date & time"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            <ClayInput
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <ClayButton type="submit" isLoading={booking}>
              Request appointment
            </ClayButton>
          </form>
        </ClayCard>
      ) : null}

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading appointments...</p>
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
                <div key={appt.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div>
                    <p className="font-medium text-clay-text">{formatDateTime(appt.scheduledAt)}</p>
                    {appt.reason ? (
                      <p className="text-sm text-clay-text-muted">{appt.reason}</p>
                    ) : null}
                    {appt.notes ? (
                      <p className="mt-1 text-sm text-clay-text-muted">{appt.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <ClayBadge variant={statusVariant(appt.status)}>
                      {appt.status.replace(/_/g, ' ')}
                    </ClayBadge>
                    {appt.status === 'scheduled' ? (
                      <ClayButton
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          cancelAppt({
                            variables: { input: { id: appt.id, reason: 'Cancelled by patient' } },
                          })
                        }
                      >
                        Cancel
                      </ClayButton>
                    ) : null}
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
