'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Calendar,
  Activity,
  HeartPulse,
  FileText,
  Pill,
  FlaskConical,
  Stethoscope,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { ClayTextarea } from '@/components/clinical/clay-textarea';
import { QueryError } from '@/components/query-error';
import {
  ADMIT_PATIENT_MUTATION,
  BEDS_QUERY,
  CREATE_APPOINTMENT_MUTATION,
  CREATE_CLINICAL_NOTE_MUTATION,
  CREATE_DIAGNOSIS_MUTATION,
  CREATE_LAB_ORDER_MUTATION,
  CREATE_PRESCRIPTION_MUTATION,
  CREATE_VITAL_SIGN_MUTATION,
  ME_QUERY,
  STAFF_MEMBERS_QUERY,
  WARDS_QUERY,
} from '@/lib/graphql/queries';
import {
  canAccessRoute,
} from '@/lib/route-access';
import {
  canActAsClinician,
  canAdmitPatients,
  canAuthorClinical,
} from '@/lib/clinical-access';

interface PatientClinicalActionsProps {
  patientId: string;
  hospitalId?: string;
}

type ActionKey =
  | 'appointment'
  | 'admit'
  | 'vitals'
  | 'soap'
  | 'diagnosis'
  | 'prescription'
  | 'lab';

const actions: { key: ActionKey; label: string; icon: typeof Calendar }[] = [
  { key: 'appointment', label: 'Book Appointment', icon: Calendar },
  { key: 'admit', label: 'Admit Patient', icon: Activity },
  { key: 'vitals', label: 'Record Vitals', icon: HeartPulse },
  { key: 'soap', label: 'Add SOAP Note', icon: FileText },
  { key: 'diagnosis', label: 'Add Diagnosis', icon: Stethoscope },
  { key: 'prescription', label: 'Add Prescription', icon: Pill },
  { key: 'lab', label: 'Order Lab Test', icon: FlaskConical },
];

export function PatientClinicalActions({ patientId, hospitalId }: PatientClinicalActionsProps) {
  const [expanded, setExpanded] = useState<ActionKey | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [admitWardId, setAdmitWardId] = useState('');
  const [admitBedId, setAdmitBedId] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const permissions = meData?.me?.permissions ?? [];
  const roles: string[] = meData?.me?.roles ?? [];
  const canWritePatients = permissions.includes('patients:write');
  const canWriteAppointments = permissions.includes('appointments:write');
  const canAuthor = canAuthorClinical(roles);
  const canClinician = canActAsClinician(roles);
  const canAdmit = canWritePatients && canAdmitPatients(roles);
  const canManageFacility = canAccessRoute('/settings', { roles, permissions });

  const actionPermissions: Record<ActionKey, boolean> = {
    appointment: canWriteAppointments,
    admit: canAdmit,
    vitals: canWritePatients && canAuthor,
    soap: canWritePatients && canAuthor,
    diagnosis: canWritePatients && canClinician,
    prescription: canWritePatients && canClinician,
    lab: canWritePatients && canAuthor,
  };

  const visibleActions = actions.filter(({ key }) => actionPermissions[key]);

  const [createAppointment, { loading: appointmentLoading }] = useMutation(CREATE_APPOINTMENT_MUTATION);
  const [admitPatient, { loading: admitLoading }] = useMutation(ADMIT_PATIENT_MUTATION);
  const [createVitalSign, { loading: vitalsLoading }] = useMutation(CREATE_VITAL_SIGN_MUTATION);
  const [createClinicalNote, { loading: noteLoading }] = useMutation(CREATE_CLINICAL_NOTE_MUTATION);
  const [createDiagnosis, { loading: diagnosisLoading }] = useMutation(CREATE_DIAGNOSIS_MUTATION);
  const [createPrescription, { loading: rxLoading }] = useMutation(CREATE_PRESCRIPTION_MUTATION);
  const [createLabOrder, { loading: labLoading }] = useMutation(CREATE_LAB_ORDER_MUTATION);

  const wardsQuery = useQuery(WARDS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId || expanded !== 'admit',
  });
  const bedsQuery = useQuery(BEDS_QUERY, {
    variables: { hospitalId, wardId: admitWardId || undefined },
    skip: !hospitalId || !admitWardId || expanded !== 'admit',
  });

  const wards: Array<{ id: string; name: string; floor?: string }> = wardsQuery.error
    ? []
    : (wardsQuery.data?.wards ?? []);
  const beds: Array<{ id: string; label: string; status: string }> = bedsQuery.error
    ? []
    : (bedsQuery.data?.beds ?? []);
  const availableBeds = beds.filter((b) => b.status === 'available');
  const facilityQueryError = wardsQuery.error || bedsQuery.error;

  const toggle = (key: ActionKey) => {
    setExpanded((prev) => (prev === key ? null : key));
    setMessage('');
    setError('');
  };

  const handleSuccess = (msg: string) => {
    setMessage(msg);
    setError('');
    setExpanded(null);
  };

  const handleAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createAppointment({
        variables: {
          hospitalId,
          input: {
            patientId,
            doctorId: (form.get('doctorId') as string) || undefined,
            scheduledAt: form.get('scheduledAt') as string,
            reason: form.get('reason') as string,
          },
        },
      });
      handleSuccess('Appointment booked successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment');
    }
  };

  const handleAdmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!admitWardId) {
      setError('Please select a ward');
      return;
    }
    if (!admitBedId) {
      setError('Please select a bed');
      return;
    }
    try {
      await admitPatient({
        variables: {
          hospitalId,
          input: {
            patientId,
            wardId: admitWardId,
            bedId: admitBedId,
            reason: (form.get('reason') as string) || undefined,
          },
        },
      });
      setAdmitWardId('');
      setAdmitBedId('');
      handleSuccess('Patient admitted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to admit patient');
    }
  };

  const handleVitals = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createVitalSign({
        variables: {
          hospitalId,
          input: {
            patientId,
            bloodPressure: (form.get('bloodPressure') as string) || undefined,
            heartRate: form.get('heartRate') ? Number(form.get('heartRate')) : undefined,
            temperature: form.get('temperature') ? Number(form.get('temperature')) : undefined,
            spo2: form.get('spo2') ? Number(form.get('spo2')) : undefined,
            weight: form.get('weight') ? Number(form.get('weight')) : undefined,
            height: form.get('height') ? Number(form.get('height')) : undefined,
            notes: (form.get('notes') as string) || undefined,
          },
        },
      });
      handleSuccess('Vitals recorded successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record vitals');
    }
  };

  const handleSoap = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createClinicalNote({
        variables: {
          hospitalId,
          input: {
            patientId,
            subjective: form.get('subjective') as string,
            objective: form.get('objective') as string,
            assessment: form.get('assessment') as string,
            plan: form.get('plan') as string,
          },
        },
      });
      handleSuccess('Clinical note saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    }
  };

  const handleDiagnosis = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createDiagnosis({
        variables: {
          hospitalId,
          input: {
            patientId,
            description: form.get('description') as string,
            icdCode: (form.get('icdCode') as string) || undefined,
            isPrimary: form.get('isPrimary') === 'on',
          },
        },
      });
      handleSuccess('Diagnosis recorded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record diagnosis');
    }
  };

  const handlePrescription = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createPrescription({
        variables: {
          hospitalId,
          input: {
            patientId,
            notes: (form.get('notes') as string) || undefined,
            items: [
              {
                drugName: form.get('drugName') as string,
                dosage: form.get('dosage') as string,
                frequency: form.get('frequency') as string,
                duration: (form.get('duration') as string) || undefined,
                instructions: (form.get('instructions') as string) || undefined,
              },
            ],
          },
        },
      });
      handleSuccess('Prescription created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prescription');
    }
  };

  const handleLab = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createLabOrder({
        variables: {
          hospitalId,
          input: {
            patientId,
            testName: form.get('testName') as string,
            notes: (form.get('notes') as string) || undefined,
          },
        },
      });
      handleSuccess('Lab order placed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to order lab test');
    }
  };

  const isLoading =
    appointmentLoading ||
    admitLoading ||
    vitalsLoading ||
    noteLoading ||
    diagnosisLoading ||
    rxLoading ||
    labLoading;

  if (visibleActions.length === 0) return null;

  return (
    <ClayCard className="lg:col-span-3">
      <h2 className="mb-4 text-lg font-semibold text-clay-text">Clinical Actions</h2>

      {message ? (
        <p className="mb-4 rounded-2xl bg-clay-success/10 px-4 py-2 text-sm text-clay-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">{error}</p>
      ) : null}

      <div className="space-y-3">
        {visibleActions.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-2xl bg-clay-primary-light/20">
            <button
              type="button"
              onClick={() => toggle(key)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-clay-text"
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-clay-primary" />
                {label}
              </span>
              {expanded === key ? (
                <ChevronUp className="h-4 w-4 text-clay-text-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 text-clay-text-muted" />
              )}
            </button>

            {expanded === key ? (
              <div className="border-t border-white/40 px-4 pb-4 pt-3">
                {key === 'appointment' ? (
                  <form onSubmit={handleAppointment} className="grid gap-3 sm:grid-cols-2">
                    <ClayInput
                      name="scheduledAt"
                      label="Scheduled At *"
                      type="datetime-local"
                      required
                      className="sm:col-span-2"
                    />
                    <DoctorSelect hospitalId={hospitalId} />
                    <ClayTextarea name="reason" label="Reason" rows={2} className="sm:col-span-2" />
                    <div className="flex gap-2 sm:col-span-2">
                      <ClayButton type="submit" size="sm" isLoading={isLoading}>
                        Book
                      </ClayButton>
                      <Link href={`/appointments/new?patientId=${patientId}`}>
                        <ClayButton type="button" variant="secondary" size="sm">
                          Full Form
                        </ClayButton>
                      </Link>
                    </div>
                  </form>
                ) : null}

                {key === 'admit' ? (
                  <form onSubmit={handleAdmit} className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="clinical-admit-ward"
                        className="text-sm font-medium text-clay-text"
                      >
                        Ward *
                      </label>
                      <select
                        id="clinical-admit-ward"
                        value={admitWardId}
                        onChange={(e) => {
                          setAdmitWardId(e.target.value);
                          setAdmitBedId('');
                        }}
                        required
                        className="w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-sm text-clay-text shadow-clay-inset outline-none focus:ring-2 focus:ring-clay-primary/30"
                      >
                        <option value="">Select ward</option>
                        {wards.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                            {w.floor ? ` · Floor ${w.floor}` : ''}
                          </option>
                        ))}
                      </select>
                      {facilityQueryError ? (
                        <QueryError
                          message="We could not load wards or beds. Please try again."
                          onRetry={() => {
                            void wardsQuery.refetch();
                            if (admitWardId) void bedsQuery.refetch();
                          }}
                          className="text-left"
                        />
                      ) : wards.length === 0 && !wardsQuery.loading ? (
                        canManageFacility ? (
                          <Link
                            href="/settings/facility"
                            className="text-xs text-clay-primary hover:underline"
                          >
                            No wards yet — set them up →
                          </Link>
                        ) : (
                          <p className="text-xs text-clay-text-muted">
                            No wards yet — ask an administrator to set them up.
                          </p>
                        )
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="clinical-admit-bed"
                        className="text-sm font-medium text-clay-text"
                      >
                        Bed *
                      </label>
                      <select
                        id="clinical-admit-bed"
                        value={admitBedId}
                        onChange={(e) => setAdmitBedId(e.target.value)}
                        disabled={!admitWardId}
                        required
                        className="w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-sm text-clay-text shadow-clay-inset outline-none focus:ring-2 focus:ring-clay-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">
                          {admitWardId ? 'Select bed' : 'Choose ward first'}
                        </option>
                        {availableBeds.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                      {admitWardId &&
                      !bedsQuery.error &&
                      availableBeds.length === 0 &&
                      !bedsQuery.loading ? (
                        <p className="text-xs text-clay-text-muted">
                          No available beds in this ward.
                        </p>
                      ) : null}
                    </div>
                    <ClayTextarea name="reason" label="Reason" rows={2} className="sm:col-span-2" />
                    <ClayButton type="submit" size="sm" isLoading={isLoading} className="sm:col-span-2">
                      Admit
                    </ClayButton>
                  </form>
                ) : null}

                {key === 'vitals' ? (
                  <form onSubmit={handleVitals} className="grid gap-3 sm:grid-cols-3">
                    <ClayInput name="bloodPressure" label="Blood Pressure" placeholder="120/80" />
                    <ClayInput name="heartRate" label="Heart Rate (bpm)" type="number" />
                    <ClayInput name="temperature" label="Temperature (°C)" type="number" step="0.1" />
                    <ClayInput name="spo2" label="SpO2 (%)" type="number" />
                    <ClayInput name="weight" label="Weight (kg)" type="number" step="0.1" />
                    <ClayInput name="height" label="Height (cm)" type="number" step="0.1" />
                    <ClayTextarea name="notes" label="Notes" rows={2} className="sm:col-span-3" />
                    <ClayButton type="submit" size="sm" isLoading={isLoading}>
                      Save Vitals
                    </ClayButton>
                  </form>
                ) : null}

                {key === 'soap' ? (
                  <form onSubmit={handleSoap} className="grid gap-3 sm:grid-cols-2">
                    <ClayTextarea name="subjective" label="Subjective" rows={3} required />
                    <ClayTextarea name="objective" label="Objective" rows={3} required />
                    <ClayTextarea name="assessment" label="Assessment" rows={3} required />
                    <ClayTextarea name="plan" label="Plan" rows={3} required />
                    <ClayButton type="submit" size="sm" isLoading={isLoading} className="sm:col-span-2">
                      Save Note
                    </ClayButton>
                  </form>
                ) : null}

                {key === 'diagnosis' ? (
                  <form onSubmit={handleDiagnosis} className="grid gap-3 sm:grid-cols-2">
                    <ClayInput
                      name="description"
                      label="Diagnosis *"
                      required
                      placeholder="e.g. Type 2 diabetes mellitus"
                      className="sm:col-span-2"
                    />
                    <ClayInput name="icdCode" label="ICD Code" placeholder="e.g. E11.9" />
                    <label className="flex items-center gap-2 text-sm text-clay-text">
                      <input type="checkbox" name="isPrimary" className="rounded" />
                      Primary diagnosis
                    </label>
                    <ClayButton type="submit" size="sm" isLoading={isLoading} className="sm:col-span-2">
                      Save Diagnosis
                    </ClayButton>
                  </form>
                ) : null}

                {key === 'prescription' ? (
                  <form onSubmit={handlePrescription} className="grid gap-3 sm:grid-cols-2">
                    <ClayInput name="drugName" label="Drug Name *" required />
                    <ClayInput name="dosage" label="Dosage *" required placeholder="500mg" />
                    <ClayInput name="frequency" label="Frequency *" required placeholder="Twice daily" />
                    <ClayInput name="duration" label="Duration" placeholder="7 days" />
                    <ClayTextarea
                      name="instructions"
                      label="Instructions"
                      rows={2}
                      className="sm:col-span-2"
                    />
                    <ClayTextarea name="notes" label="Notes" rows={2} className="sm:col-span-2" />
                    <ClayButton type="submit" size="sm" isLoading={isLoading}>
                      Create Prescription
                    </ClayButton>
                  </form>
                ) : null}

                {key === 'lab' ? (
                  <form onSubmit={handleLab} className="grid gap-3">
                    <ClayInput name="testName" label="Test Name *" required placeholder="CBC, BMP, etc." />
                    <ClayTextarea name="notes" label="Notes" rows={2} />
                    <ClayButton type="submit" size="sm" isLoading={isLoading}>
                      Order Lab Test
                    </ClayButton>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </ClayCard>
  );
}

function DoctorSelect({ hospitalId }: { hospitalId?: string }) {
  const { data, error, refetch } = useQuery(STAFF_MEMBERS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });
  const doctors = error
    ? []
    : (data?.staffMembers ?? []).filter(
        (s: { roleSlug: string; isActive: boolean }) =>
          s.isActive && (s.roleSlug === 'doctor' || s.roleSlug === 'hospital_admin'),
      );

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="clinical-doctor" className="text-sm font-medium text-clay-text">
        Doctor (optional)
      </label>
      {error ? (
        <QueryError
          message="We could not load doctors. Please try again."
          onRetry={() => void refetch()}
          className="text-left"
        />
      ) : (
        <select
          id="clinical-doctor"
          name="doctorId"
          className="rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-sm shadow-clay-inset"
          defaultValue=""
        >
          <option value="">Unassigned</option>
          {doctors.map((d: { userId: string; fullName: string }) => (
            <option key={d.userId} value={d.userId}>
              {d.fullName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
