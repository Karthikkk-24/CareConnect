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
  RESCHEDULE_FOLLOW_UP_MUTATION,
  STAFF_MEMBERS_QUERY,
  UPDATE_FOLLOW_UP_STATUS_MUTATION,
} from '@/lib/graphql/queries';
import { QueryError } from '@/components/query-error';
import { canWriteFollowUps } from '@/lib/clinical-access';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateTimeLocalValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function canRescheduleFollowUp(status: string) {
  return status === 'scheduled' || status === 'rescheduled' || status === 'missed';
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
  const roles: string[] = meData?.me?.roles ?? [];
  const canWriteFollowUp =
    (meData?.me?.permissions ?? []).includes('patients:write') && canWriteFollowUps(roles);
  const [showForm, setShowForm] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [type, setType] = useState('outpatient');
  const [error, setError] = useState('');
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState('');

  const {
    data,
    loading,
    error: listError,
    refetch,
  } = useQuery(FOLLOW_UPS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const {
    data: patientsData,
    error: patientsError,
    refetch: refetchPatients,
  } = useQuery(PATIENTS_QUERY, {
    variables: { search: patientSearch, limit: 8, hospitalId },
    skip: !hospitalId || patientSearch.length < 2,
  });

  const {
    data: staffData,
    error: staffError,
    refetch: refetchStaff,
  } = useQuery(STAFF_MEMBERS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId || !showForm,
  });

  const doctors = staffError
    ? []
    : (staffData?.staffMembers ?? []).filter(
        (s: { roleSlug: string; isActive: boolean }) =>
          // Match HospitalDoctorValidator / appointments/new: doctor role only.
          s.isActive && s.roleSlug === 'doctor',
      );

  const [updateStatus] = useMutation(UPDATE_FOLLOW_UP_STATUS_MUTATION, {
    onCompleted: () => refetch(),
  });
  const [rescheduleFollowUp] = useMutation(RESCHEDULE_FOLLOW_UP_MUTATION, {
    onCompleted: () => {
      setReschedulingId(null);
      refetch();
    },
  });
  const [createFollowUp, { loading: creating }] = useMutation(CREATE_FOLLOW_UP_MUTATION, {
    onCompleted: () => {
      refetch();
      setShowForm(false);
      setPatientId('');
      setDoctorId('');
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

  const handleReschedule = async (id: string) => {
    setError('');
    if (!rescheduleAt) {
      setError('Choose a new date and time to reschedule');
      return;
    }
    try {
      await rescheduleFollowUp({
        variables: {
          hospitalId,
          input: { id, scheduledAt: new Date(rescheduleAt).toISOString() },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule follow-up');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (staffError) {
      setError('Could not load doctors. Please retry before scheduling.');
      return;
    }
    if (!patientId || !scheduledAt) {
      setError('Patient and schedule are required');
      return;
    }
    if (!doctorId) {
      setError('Doctor is required');
      return;
    }
    await createFollowUp({
      variables: {
        hospitalId,
        input: {
          patientId,
          doctorId,
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
        {canWriteFollowUp ? (
          <ClayButton onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'Hide form' : 'Schedule follow-up'}
          </ClayButton>
        ) : null}
      </div>

      {error && !showForm ? <p className="mb-4 text-sm text-clay-error">{error}</p> : null}

      {showForm ? (
        <ClayCard className="mb-6 max-w-xl space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <ClayInput
              label="Search patient"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Type at least 2 characters"
            />
            {patientsError ? (
              <QueryError
                message="We could not search patients. Please try again."
                onRetry={() => void refetchPatients()}
                className="text-left"
              />
            ) : (patientsData?.patients?.items ?? []).length > 0 ? (
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
            <div className="flex flex-col gap-2">
              <label htmlFor="follow-up-doctor" className="text-sm font-medium text-clay-text">
                Doctor *
              </label>
              {staffError ? (
                <QueryError
                  message="We could not load doctors. Please try again."
                  onRetry={() => void refetchStaff()}
                  className="text-left"
                />
              ) : (
                <select
                  id="follow-up-doctor"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-sm text-clay-text shadow-clay-inset outline-none focus:ring-2 focus:ring-clay-primary/30"
                >
                  <option value="">Select doctor</option>
                  {doctors.map((d: { userId: string; fullName: string }) => (
                    <option key={d.userId} value={d.userId}>
                      {d.fullName}
                    </option>
                  ))}
                </select>
              )}
            </div>
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
            {canWriteFollowUp ? (
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
                  {canWriteFollowUp && reschedulingId === item.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="datetime-local"
                        value={rescheduleAt}
                        onChange={(e) => setRescheduleAt(e.target.value)}
                        className="rounded-2xl border border-white/60 bg-clay-surface px-3 py-2 text-sm shadow-clay-inset"
                      />
                      <ClayButton size="sm" onClick={() => void handleReschedule(item.id)}>
                        Save
                      </ClayButton>
                      <ClayButton size="sm" variant="ghost" onClick={() => setReschedulingId(null)}>
                        Close
                      </ClayButton>
                    </div>
                  ) : (
                    <>
                      {item.status === 'scheduled' && canWriteFollowUp ? (
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
                      {canWriteFollowUp && canRescheduleFollowUp(item.status) ? (
                        <ClayButton
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setReschedulingId(item.id);
                            setRescheduleAt(toDateTimeLocalValue(item.scheduledAt));
                          }}
                        >
                          Reschedule
                        </ClayButton>
                      ) : null}
                    </>
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
