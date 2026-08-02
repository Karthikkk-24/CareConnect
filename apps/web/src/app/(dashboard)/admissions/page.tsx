'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Activity, BedDouble, Plus } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { ClayTextarea } from '@/components/clinical/clay-textarea';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  ACTIVE_ADMISSIONS_QUERY,
  ADMIT_PATIENT_MUTATION,
  BEDS_QUERY,
  ME_QUERY,
  PATIENTS_QUERY,
  WARDS_QUERY,
} from '@/lib/graphql/queries';

export default function AdmissionsPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [wardId, setWardId] = useState('');
  const [bedId, setBedId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const canWritePatients = (meData?.me?.permissions ?? []).includes('patients:write');

  const { data, loading, refetch } = useQuery(ACTIVE_ADMISSIONS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const { data: patientsData } = useQuery(PATIENTS_QUERY, {
    variables: { search: patientSearch, limit: 8, hospitalId },
    skip: !hospitalId || patientSearch.length < 2,
  });

  const { data: wardsData } = useQuery(WARDS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const { data: bedsData } = useQuery(BEDS_QUERY, {
    variables: { hospitalId, wardId: wardId || undefined },
    skip: !hospitalId || !wardId,
  });

  const wards: Array<{ id: string; name: string; floor?: string }> = wardsData?.wards ?? [];
  const beds: Array<{ id: string; label: string; status: string; wardId: string }> =
    bedsData?.beds ?? [];
  const availableBeds = beds.filter((b) => b.status === 'available');

  const [admitPatient, { loading: admitting }] = useMutation(ADMIT_PATIENT_MUTATION, {
    onCompleted: () => {
      refetch();
      setShowForm(false);
      setPatientId('');
      setWardId('');
      setBedId('');
      setReason('');
    },
  });

  const admissions = data?.activeAdmissions ?? [];

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!patientId.trim()) {
      setError('Patient is required');
      return;
    }
    if (!wardId) {
      setError('Ward is required');
      return;
    }
    if (!bedId) {
      setError('Bed is required');
      return;
    }
    try {
      await admitPatient({
        variables: {
          hospitalId,
          input: {
            patientId: patientId.trim(),
            wardId,
            bedId,
            reason: reason || undefined,
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to admit patient');
    }
  };

  const handleDischarge = (patientId: string) => {
    router.push(`/patients/${patientId}/discharge`);
  };

  return (
    <div>
      <DashboardHeader title="Admissions" subtitle="Active inpatient admissions" />

      <div className="mb-6 flex flex-wrap justify-between gap-3">
        <Link href="/admissions/occupancy">
          <ClayButton variant="secondary">
            <BedDouble className="h-4 w-4" />
            Bed Occupancy
          </ClayButton>
        </Link>
        {canWritePatients ? (
        <ClayButton onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          {showForm ? 'Hide Form' : 'Admit Patient'}
        </ClayButton>
        ) : null}
      </div>

      {showForm ? (
        <ClayCard className="mb-6 max-w-2xl">
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Admit Patient</h2>
          {error ? <p className="mb-4 text-sm text-clay-error">{error}</p> : null}
          <form onSubmit={handleAdmit} className="space-y-4">
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
              label="Selected Patient ID"
              placeholder="Pick a patient using search above"
              value={patientId}
              readOnly
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="admit-ward" className="text-sm font-medium text-clay-text">
                  Ward *
                </label>
                <select
                  id="admit-ward"
                  value={wardId}
                  onChange={(e) => {
                    setWardId(e.target.value);
                    setBedId('');
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
                {wards.length === 0 ? (
                  <Link
                    href="/settings/facility"
                    className="text-xs text-clay-primary hover:underline"
                  >
                    No wards yet — set them up →
                  </Link>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="admit-bed" className="text-sm font-medium text-clay-text">
                  Bed *
                </label>
                <select
                  id="admit-bed"
                  value={bedId}
                  onChange={(e) => setBedId(e.target.value)}
                  disabled={!wardId}
                  required
                  className="w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-sm text-clay-text shadow-clay-inset outline-none focus:ring-2 focus:ring-clay-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">{wardId ? 'Select bed' : 'Choose ward first'}</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
                {wardId && availableBeds.length === 0 ? (
                  <p className="text-xs text-clay-text-muted">
                    No available beds in this ward.
                  </p>
                ) : null}
              </div>
            </div>
            <ClayTextarea
              label="Reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <ClayButton type="submit" isLoading={admitting}>
              Admit Patient
            </ClayButton>
          </form>
        </ClayCard>
      ) : null}

      <ClayCard padding="none" className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/40 bg-clay-primary-light/30">
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Patient</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Ward / Bed</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Admitted</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Reason</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-clay-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-clay-text-muted">
                  Loading admissions...
                </td>
              </tr>
            ) : admissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Activity className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
                  <p className="text-clay-text-muted">No active admissions.</p>
                </td>
              </tr>
            ) : (
              admissions.map(
                (adm: {
                  id: string;
                  patientId?: string;
                  patient?: { id?: string; fullName: string };
                  ward?: { name: string };
                  bed?: { label: string };
                  admittedAt: string;
                  reason?: string;
                  status: string;
                }) => (
                  <tr key={adm.id} className="border-b border-white/20 hover:bg-clay-primary-light/20">
                    <td className="px-6 py-4 text-sm font-medium text-clay-text">
                      {adm.patient?.fullName ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-clay-text-muted">
                      {[adm.ward?.name, adm.bed?.label].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-clay-text-muted">
                      {new Date(adm.admittedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-clay-text-muted">{adm.reason ?? '—'}</td>
                    <td className="px-6 py-4">
                      <ClayBadge variant="success">{adm.status}</ClayBadge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canWritePatients ? (
                      <ClayButton
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const patientId = adm.patientId ?? adm.patient?.id;
                          if (patientId) handleDischarge(patientId);
                        }}
                      >
                        Discharge
                      </ClayButton>
                      ) : null}
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </ClayCard>
    </div>
  );
}
