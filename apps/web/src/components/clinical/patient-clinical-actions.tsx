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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { ClayTextarea } from '@/components/clinical/clay-textarea';
import {
  ADMIT_PATIENT_MUTATION,
  BEDS_QUERY,
  CREATE_APPOINTMENT_MUTATION,
  CREATE_CLINICAL_NOTE_MUTATION,
  CREATE_LAB_ORDER_MUTATION,
  CREATE_PRESCRIPTION_MUTATION,
  CREATE_VITAL_SIGN_MUTATION,
  WARDS_QUERY,
} from '@/lib/graphql/queries';

interface PatientClinicalActionsProps {
  patientId: string;
  hospitalId?: string;
}

type ActionKey =
  | 'appointment'
  | 'admit'
  | 'vitals'
  | 'soap'
  | 'prescription'
  | 'lab';

const actions: { key: ActionKey; label: string; icon: typeof Calendar }[] = [
  { key: 'appointment', label: 'Book Appointment', icon: Calendar },
  { key: 'admit', label: 'Admit Patient', icon: Activity },
  { key: 'vitals', label: 'Record Vitals', icon: HeartPulse },
  { key: 'soap', label: 'Add SOAP Note', icon: FileText },
  { key: 'prescription', label: 'Add Prescription', icon: Pill },
  { key: 'lab', label: 'Order Lab Test', icon: FlaskConical },
];

export function PatientClinicalActions({ patientId, hospitalId }: PatientClinicalActionsProps) {
  const [expanded, setExpanded] = useState<ActionKey | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [admitWardId, setAdmitWardId] = useState('');
  const [admitBedId, setAdmitBedId] = useState('');

  const [createAppointment, { loading: appointmentLoading }] = useMutation(CREATE_APPOINTMENT_MUTATION);
  const [admitPatient, { loading: admitLoading }] = useMutation(ADMIT_PATIENT_MUTATION);
  const [createVitalSign, { loading: vitalsLoading }] = useMutation(CREATE_VITAL_SIGN_MUTATION);
  const [createClinicalNote, { loading: noteLoading }] = useMutation(CREATE_CLINICAL_NOTE_MUTATION);
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

  const wards: Array<{ id: string; name: string; floor?: string }> =
    wardsQuery.data?.wards ?? [];
  const beds: Array<{ id: string; label: string; status: string }> = bedsQuery.data?.beds ?? [];
  const availableBeds = beds.filter((b) => b.status === 'available');

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
    appointmentLoading || admitLoading || vitalsLoading || noteLoading || rxLoading || labLoading;

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
        {actions.map(({ key, label, icon: Icon }) => (
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
                    <ClayInput name="doctorId" label="Doctor ID (optional)" placeholder="UUID" />
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
                      {wards.length === 0 && !wardsQuery.loading ? (
                        <Link
                          href="/settings/facility"
                          className="text-xs text-clay-primary hover:underline"
                        >
                          No wards yet — set them up →
                        </Link>
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
                      {admitWardId && availableBeds.length === 0 && !bedsQuery.loading ? (
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
