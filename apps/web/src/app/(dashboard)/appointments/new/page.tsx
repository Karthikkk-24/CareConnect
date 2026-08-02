'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { ClayTextarea } from '@/components/clinical/clay-textarea';
import { ForbiddenAccess } from '@/components/auth/forbidden-access';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  CREATE_APPOINTMENT_MUTATION,
  ME_QUERY,
  PATIENTS_QUERY,
  STAFF_MEMBERS_QUERY,
} from '@/lib/graphql/queries';

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillPatientId = searchParams.get('patientId') ?? '';

  const [patientId, setPatientId] = useState(prefillPatientId);
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data: patientsData } = useQuery(PATIENTS_QUERY, {
    variables: { search: patientSearch, limit: 8, hospitalId },
    skip: !hospitalId || patientSearch.length < 2,
  });

  const { data: staffData } = useQuery(STAFF_MEMBERS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const [createAppointment, { loading }] = useMutation(CREATE_APPOINTMENT_MUTATION);

  const canWriteAppointments = (meData?.me?.permissions ?? []).includes('appointments:write');

  const doctors =
    staffData?.staffMembers?.filter(
      (s: { roleSlug: string; isActive: boolean }) =>
        s.isActive && (s.roleSlug === 'doctor' || s.roleSlug === 'physician'),
    ) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!patientId.trim()) {
      setError('Patient ID is required');
      return;
    }
    if (!scheduledAt) {
      setError('Scheduled time is required');
      return;
    }
    try {
      await createAppointment({
        variables: {
          hospitalId,
          input: {
            patientId: patientId.trim(),
            doctorId: doctorId || undefined,
            scheduledAt: new Date(scheduledAt).toISOString(),
            reason: reason || undefined,
          },
        },
      });
      router.push('/appointments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment');
    }
  };

  if (!meData?.me) {
    return null;
  }

  if (!canWriteAppointments) {
    return (
      <ForbiddenAccess message="You do not have permission to create appointments." />
    );
  }

  return (
    <div>
      <DashboardHeader title="New Appointment" subtitle="Schedule a patient visit" />

      <ClayCard className="max-w-2xl">
        {error ? <p className="mb-4 text-sm text-clay-error">{error}</p> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <ClayInput
            label="Search Patient"
            placeholder="Type name to search..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
          />
          {patientsData?.patients?.items?.length ? (
            <div className="rounded-2xl bg-clay-primary-light/30 p-2">
              {patientsData.patients.items.map((p: { id: string; fullName: string }) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPatientId(p.id);
                    setPatientSearch(p.fullName);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-clay-text hover:bg-clay-primary-light/50"
                >
                  {p.fullName}
                </button>
              ))}
            </div>
          ) : null}

          <ClayInput
            label="Patient ID *"
            placeholder="UUID"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="doctor" className="text-sm font-medium text-clay-text">
              Doctor (optional)
            </label>
            {doctors.length > 0 ? (
              <select
                id="doctor"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-sm text-clay-text shadow-clay-inset outline-none focus:ring-2 focus:ring-clay-primary/30"
              >
                <option value="">No doctor assigned</option>
                {doctors.map((d: { userId: string; fullName: string }) => (
                  <option key={d.userId} value={d.userId}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            ) : (
              <ClayInput
                label=""
                placeholder="Doctor user UUID"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              />
            )}
          </div>

          <ClayInput
            label="Scheduled At *"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />

          <ClayTextarea
            label="Reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for visit..."
          />

          <div className="flex gap-3">
            <ClayButton type="submit" isLoading={loading}>
              Create Appointment
            </ClayButton>
            <ClayButton type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </ClayButton>
          </div>
        </form>
      </ClayCard>
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<p className="text-clay-text-muted">Loading...</p>}>
      <NewAppointmentForm />
    </Suspense>
  );
}
