'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ClayButton, ClayCard } from '@careconnect/ui';
import { ClayTextarea } from '@/components/clinical/clay-textarea';
import { ForbiddenAccess } from '@/components/auth/forbidden-access';
import { QueryError } from '@/components/query-error';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  ACTIVE_ADMISSIONS_QUERY,
  CREATE_DISCHARGE_MUTATION,
  ME_QUERY,
  PATIENT_QUERY,
} from '@/lib/graphql/queries';
import { canDischargePatients } from '@/lib/clinical-access';

export default function PatientDischargePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [summary, setSummary] = useState('');
  const [medications, setMedications] = useState('');
  const [instructions, setInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [error, setError] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const roles: string[] = meData?.me?.roles ?? [];
  const canWritePatients = (meData?.me?.permissions ?? []).includes('patients:write');
  const canDischarge = canWritePatients && canDischargePatients(roles);

  const { data: patientData, loading: patientLoading, error: patientError, refetch: refetchPatient } = useQuery(PATIENT_QUERY, {
    variables: { id, hospitalId },
    skip: !id,
  });

  const {
    data: admissionsData,
    loading: admissionsLoading,
    error: admissionsError,
    refetch: refetchAdmissions,
  } = useQuery(ACTIVE_ADMISSIONS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const admission = admissionsData?.activeAdmissions?.find(
    (item: { patientId: string }) => item.patientId === id,
  );

  const [createDischarge, { loading: submitting }] = useMutation(CREATE_DISCHARGE_MUTATION, {
    onCompleted: () => router.push(`/patients/${id}`),
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!admission) {
      setError('No active admission found for this patient.');
      return;
    }

    try {
      await createDischarge({
        variables: {
          hospitalId,
          input: {
            admissionId: admission.id,
            summary: summary || undefined,
            medicationsAtDischarge: medications || undefined,
            instructions: instructions || undefined,
            followUpScheduledAt: followUpDate ? new Date(followUpDate).toISOString() : undefined,
            followUpType: followUpDate ? 'post_discharge' : undefined,
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create discharge');
    }
  };

  if (!meData?.me) {
    return null;
  }

  if (!canDischarge) {
    return (
      <ForbiddenAccess message="You do not have permission to discharge patients." />
    );
  }

  if (patientLoading || admissionsLoading) {
    return <p className="text-clay-text-muted">Loading discharge form...</p>;
  }

  if (patientError) {
    return (
      <div className="py-8">
        <QueryError
          message="We could not load this patient. Please try again."
          onRetry={() => void refetchPatient()}
        />
      </div>
    );
  }

  const patient = patientData?.patient;
  if (!patient) return <p className="text-clay-error">Patient not found</p>;

  if (admissionsError) {
    return (
      <div>
        <DashboardHeader
          title="Discharge Patient"
          subtitle={`Complete discharge summary for ${patient.fullName}`}
        />
        <Link
          href={`/patients/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-clay-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to patient
        </Link>
        <ClayCard>
          <QueryError
            message="We could not load active admissions. Please try again."
            onRetry={() => void refetchAdmissions()}
          />
        </ClayCard>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader
        title="Discharge Patient"
        subtitle={`Complete discharge summary for ${patient.fullName}`}
      />

      <Link
        href={`/patients/${id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-clay-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to patient
      </Link>

      {!admission ? (
        <ClayCard>
          <p className="text-clay-text-muted">
            This patient does not have an active admission. Discharge summaries require an active
            or recent admission record.
          </p>
        </ClayCard>
      ) : (
        <ClayCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <ClayTextarea
              label="Discharge Summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              placeholder="Clinical summary at discharge..."
            />

            <ClayTextarea
              label="Medications at Discharge"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              rows={3}
              placeholder="List medications prescribed at discharge..."
            />

            <ClayTextarea
              label="Patient Instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Care instructions, activity restrictions, warning signs..."
            />

            <div className="flex w-full flex-col gap-2">
              <label htmlFor="follow-up-date" className="text-sm font-medium text-clay-text">
                Optional Follow-up Date
              </label>
              <input
                id="follow-up-date"
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-clay-text shadow-clay-inset outline-none focus:ring-2 focus:ring-clay-primary/30"
              />
            </div>

            {error ? <p className="text-sm text-clay-error">{error}</p> : null}

            <div className="flex gap-3">
              <ClayButton type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Complete Discharge'}
              </ClayButton>
              <Link href={`/patients/${id}`}>
                <ClayButton type="button" variant="secondary">
                  Cancel
                </ClayButton>
              </Link>
            </div>
          </form>
        </ClayCard>
      )}
    </div>
  );
}
