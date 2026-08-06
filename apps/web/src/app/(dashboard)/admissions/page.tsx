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
  TRANSFER_ADMISSION_MUTATION,
  TRANSFER_OUT_ADMISSION_MUTATION,
  WARDS_QUERY,
} from '@/lib/graphql/queries';
import { canAdmitPatients, canDischargePatients } from '@/lib/clinical-access';
import { canAccessRoute } from '@/lib/route-access';
import { QueryError } from '@/components/query-error';

type ActiveForm =
  | null
  | { kind: 'transfer'; admissionId: string }
  | { kind: 'transferOut'; admissionId: string };

export default function AdmissionsPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [wardId, setWardId] = useState('');
  const [bedId, setBedId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [transferWardId, setTransferWardId] = useState('');
  const [transferBedId, setTransferBedId] = useState('');
  const [transferOutNotes, setTransferOutNotes] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const roles: string[] = meData?.me?.roles ?? [];
  const permissions: string[] = meData?.me?.permissions ?? [];
  const canWritePatients = permissions.includes('patients:write');
  const canAdmit = canWritePatients && canAdmitPatients(roles);
  const canDischarge = canWritePatients && canDischargePatients(roles);
  const canTransfer = canAdmit;
  const canTransferOut = canDischarge;
  const canManageFacility = canAccessRoute('/settings', { roles, permissions });

  const { data, loading, error: listError, refetch } = useQuery(ACTIVE_ADMISSIONS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const { data: patientsData } = useQuery(PATIENTS_QUERY, {
    variables: { search: patientSearch, limit: 8, hospitalId },
    skip: !hospitalId || patientSearch.length < 2,
  });

  const { data: wardsData, error: wardsError } = useQuery(WARDS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const bedsWardId = activeForm?.kind === 'transfer' ? transferWardId : wardId;
  const { data: bedsData, error: bedsError } = useQuery(BEDS_QUERY, {
    variables: { hospitalId, wardId: bedsWardId || undefined },
    skip: !hospitalId || !bedsWardId,
  });

  const wards: Array<{ id: string; name: string; floor?: string }> = wardsError
    ? []
    : (wardsData?.wards ?? []);
  const beds: Array<{ id: string; label: string; status: string; wardId: string }> =
    bedsError ? [] : (bedsData?.beds ?? []);
  const availableBeds = beds.filter((b) => b.status === 'available');
  const facilityQueryError = wardsError || bedsError;

  const resetActionForm = () => {
    setActiveForm(null);
    setTransferWardId('');
    setTransferBedId('');
    setTransferOutNotes('');
  };

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

  const [transferAdmission, { loading: transferring }] = useMutation(
    TRANSFER_ADMISSION_MUTATION,
    {
      onCompleted: () => {
        refetch();
        resetActionForm();
      },
    },
  );

  const [transferOutAdmission, { loading: transferringOut }] = useMutation(
    TRANSFER_OUT_ADMISSION_MUTATION,
    {
      onCompleted: () => {
        refetch();
        resetActionForm();
      },
    },
  );

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

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm || activeForm.kind !== 'transfer') return;
    setError('');
    if (!transferWardId || !transferBedId) {
      setError('Ward and bed are required for transfer');
      return;
    }
    try {
      await transferAdmission({
        variables: {
          hospitalId,
          input: {
            admissionId: activeForm.admissionId,
            wardId: transferWardId,
            bedId: transferBedId,
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer patient');
    }
  };

  const handleTransferOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeForm || activeForm.kind !== 'transferOut') return;
    setError('');
    try {
      await transferOutAdmission({
        variables: {
          hospitalId,
          input: {
            admissionId: activeForm.admissionId,
            notes: transferOutNotes || undefined,
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer out patient');
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
        {canAdmit ? (
        <ClayButton onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          {showForm ? 'Hide Form' : 'Admit Patient'}
        </ClayButton>
        ) : null}
      </div>

      {error ? <p className="mb-4 text-sm text-clay-error">{error}</p> : null}

      {showForm ? (
        <ClayCard className="mb-6 max-w-2xl">
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Admit Patient</h2>
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
                {facilityQueryError ? (
                  <QueryError
                    message="We could not load wards or beds. Please try again."
                    onRetry={() => {
                      void refetch();
                    }}
                  />
                ) : wards.length === 0 ? (
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

      {activeForm?.kind === 'transfer' ? (
        <ClayCard className="mb-6 max-w-2xl">
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Transfer bed</h2>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="transfer-ward" className="text-sm font-medium text-clay-text">
                  New ward *
                </label>
                <select
                  id="transfer-ward"
                  value={transferWardId}
                  onChange={(e) => {
                    setTransferWardId(e.target.value);
                    setTransferBedId('');
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
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="transfer-bed" className="text-sm font-medium text-clay-text">
                  New bed *
                </label>
                <select
                  id="transfer-bed"
                  value={transferBedId}
                  onChange={(e) => setTransferBedId(e.target.value)}
                  disabled={!transferWardId}
                  required
                  className="w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-sm text-clay-text shadow-clay-inset outline-none focus:ring-2 focus:ring-clay-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {transferWardId ? 'Select bed' : 'Choose ward first'}
                  </option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ClayButton type="submit" isLoading={transferring}>
                Confirm transfer
              </ClayButton>
              <ClayButton type="button" variant="ghost" onClick={resetActionForm}>
                Cancel
              </ClayButton>
            </div>
          </form>
        </ClayCard>
      ) : null}

      {activeForm?.kind === 'transferOut' ? (
        <ClayCard className="mb-6 max-w-2xl">
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Transfer out</h2>
          <form onSubmit={handleTransferOut} className="space-y-4">
            <ClayTextarea
              label="Notes"
              rows={3}
              value={transferOutNotes}
              onChange={(e) => setTransferOutNotes(e.target.value)}
              placeholder="Destination facility, reason…"
            />
            <div className="flex flex-wrap gap-2">
              <ClayButton type="submit" isLoading={transferringOut}>
                Confirm transfer out
              </ClayButton>
              <ClayButton type="button" variant="ghost" onClick={resetActionForm}>
                Cancel
              </ClayButton>
            </div>
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
            ) : listError ? (
              <tr>
                <td colSpan={6} className="px-6 py-8">
                  <QueryError
                    message="We could not load admissions. Please try again."
                    onRetry={() => void refetch()}
                  />
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
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        {canTransfer ? (
                          <ClayButton
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setError('');
                              setTransferWardId('');
                              setTransferBedId('');
                              setActiveForm({ kind: 'transfer', admissionId: adm.id });
                            }}
                          >
                            Transfer
                          </ClayButton>
                        ) : null}
                        {canTransferOut ? (
                          <ClayButton
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setError('');
                              setTransferOutNotes('');
                              setActiveForm({ kind: 'transferOut', admissionId: adm.id });
                            }}
                          >
                            Transfer out
                          </ClayButton>
                        ) : null}
                        {canDischarge ? (
                          <ClayButton
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const pid = adm.patientId ?? adm.patient?.id;
                              if (pid) handleDischarge(pid);
                            }}
                          >
                            Discharge
                          </ClayButton>
                        ) : null}
                      </div>
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
