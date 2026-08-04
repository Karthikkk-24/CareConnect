'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { CalendarClock, Plus } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  CREATE_FOLLOW_UP_MUTATION,
  FOLLOW_UPS_QUERY,
  ME_QUERY,
  PATIENTS_QUERY,
  UPDATE_FOLLOW_UP_STATUS_MUTATION,
} from '@/lib/graphql/queries';
import { QueryError } from '@/components/query-error';

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
    case 'missed':
      return 'error' as const;
    case 'rescheduled':
      return 'info' as const;
    default:
      return 'default' as const;
  }
};

export default function FollowUpsPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const canWritePatients = (meData?.me?.permissions ?? []).includes('patients:write');
  const [showForm, setShowForm] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [type, setType] = useState('outpatient');
  const [error, setError] = useState('');

  const { data, loading, error: listError, refetch } = useQuery(FOLLOW_UPS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const { data: patientsData } = useQuery(PATIENTS_QUERY, {
    variables: { search: patientSearch, limit: 8, hospitalId },
    skip: !hospitalId || patientSearch.length < 2,
  });

  const [updateStatus] = useMutation(UPDATE_FOLLOW_UP_STATUS_MUTATION, {
    onCompleted: () => refetch(),
  });
  const [createFollowUp, { loading: creating }] = useMutation(CREATE_FOLLOW_UP_MUTATION, {
    onCompleted: () => {
      refetch();
      setShowForm(false);
      setPatientId('');
      setScheduledAt('');
      setPatientSearch('');
    },
    onError: (err) => setError(err.message),
  });

  const followUps = data?.followUps ?? [];

  const handleStatus = async (id: string, status: string) => {
    setError('');
    try {
      await updateStatus({ variables: { hospitalId, input: { id, status } } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update follow-up status');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!patientId || !scheduledAt) {
      setError('Patient and schedule are required');
      return;
    }
    await createFollowUp({
      variables: {
        hospitalId,
        input: {
          patientId,
          scheduledAt: new Date(scheduledAt).toISOString(),
          type,
        },
      },
    });
  };

  return (
    <div>
      <DashboardHeader
        title="Follow-ups"
        subtitle="Scheduled post-discharge and outpatient follow-up visits"
      />

      <div className="mb-6 flex justify-end">
        {canWritePatients ? (
        <ClayButton onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Hide form' : 'Schedule follow-up'}
        </ClayButton>
        ) : null}
      </div>

      {error && !showForm ? (
        <p className="mb-4 text-sm text-clay-error">{error}</p>
      ) : null}

      {showForm ? (
        <ClayCard className="mb-6 max-w-xl space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <ClayInput
              label="Search patient"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Type at least 2 characters"
            />
            {(patientsData?.patients?.items ?? []).length > 0 ? (
              <ul className="max-h-40 overflow-auto rounded-2xl bg-clay-primary-light/20 text-sm">
                {(patientsData?.patients?.items ?? []).map(
                  (p: { id: string; fullName: string }) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`block w-full px-4 py-2 text-left hover:bg-clay-primary-light/40 ${
                          patientId === p.id ? 'bg-clay-primary-light/50 font-medium' : ''
                        }`}
                        onClick={() => {
                          setPatientId(p.id);
                          setPatientSearch(p.fullName);
                        }}
                      >
                        {p.fullName}
                      </button>
                    </li>
                  ),
                )}
              </ul>
            ) : null}
            <ClayInput
              label="Scheduled at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            <label className="block text-sm font-medium text-clay-text">
              Type
              <select
                className="mt-1 w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 shadow-clay-inset"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="outpatient">Outpatient</option>
                <option value="post_discharge">Post-discharge</option>
                <option value="telehealth">Telehealth</option>
              </select>
            </label>
            {error ? <p className="text-sm text-clay-error">{error}</p> : null}
            <ClayButton type="submit" isLoading={creating}>
              Create follow-up
            </ClayButton>
          </form>
        </ClayCard>
      ) : null}

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading follow-ups...</p>
        ) : listError ? (
          <div className="px-6 py-8">
            <QueryError
              message="We could not load follow-ups. Please try again."
              onRetry={() => void refetch()}
            />
          </div>
        ) : followUps.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarClock className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
            <p className="text-clay-text-muted">No follow-ups scheduled.</p>
            {canWritePatients ? (
            <ClayButton className="mt-4" size="sm" onClick={() => setShowForm(true)}>
              Schedule one
            </ClayButton>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {followUps.map(
              (item: {
                id: string;
                patientName?: string;
                doctorName?: string;
                scheduledAt: string;
                type?: string;
                status: string;
              }) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-clay-primary-light/20"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-clay-primary-light text-clay-primary shadow-clay-inset">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-clay-text">
                      {formatDateTime(item.scheduledAt)} — {item.patientName ?? 'Unknown patient'}
                    </p>
                    <p className="text-sm text-clay-text-muted">
                      {item.doctorName ? `Dr. ${item.doctorName}` : 'No doctor assigned'}
                      {item.type ? ` · ${item.type.replace(/_/g, ' ')}` : ''}
                    </p>
                  </div>
                  <ClayBadge variant={statusVariant(item.status)}>
                    {item.status.replace(/_/g, ' ')}
                  </ClayBadge>
                  {item.status === 'scheduled' && canWritePatients ? (
                    <div className="flex gap-2">
                      <ClayButton size="sm" onClick={() => handleStatus(item.id, 'completed')}>
                        Complete
                      </ClayButton>
                      <ClayButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStatus(item.id, 'missed')}
                      >
                        Missed
                      </ClayButton>
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
