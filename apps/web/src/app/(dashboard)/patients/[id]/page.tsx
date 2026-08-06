'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { FileText, History, Upload } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { ADD_PATIENT_DOCUMENT_MUTATION, CANCEL_PRESCRIPTION_MUTATION, DELETE_PATIENT_DOCUMENT, DELETE_PATIENT_MUTATION, DISCHARGES_QUERY, LINK_PATIENT_ACCOUNT, ME_QUERY, PATIENT_DIAGNOSES_QUERY, PATIENT_NOTES_QUERY, PATIENT_PRESCRIPTIONS_QUERY, PATIENT_QUERY, PATIENT_VITALS_QUERY, UNLINK_PATIENT_ACCOUNT, UPDATE_PATIENT_STATUS } from '@/lib/graphql/queries';
import { PatientClinicalActions } from '@/components/clinical/patient-clinical-actions';
import { QueryError } from '@/components/query-error';
import {
  canActAsClinician,
  canAdminPatients,
  canDischargePatients,
  canWritePatientDemographics,
} from '@/lib/clinical-access';
import { useAuth } from '@clerk/nextjs';

/** Free-form status values — admission/discharge flows own admitted/discharged. */
const EDITABLE_PATIENT_STATUSES = ['registered', 'checked_in', 'inactive'] as const;

const DOCUMENT_TYPES = [
  { value: 'identification', label: 'Identification' },
  { value: 'medical_record', label: 'Medical Record' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'lab_result', label: 'Lab Result' },
  { value: 'other', label: 'Other' },
];

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [documentType, setDocumentType] = useState('identification');
  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading, error: patientError, refetch } = useQuery(PATIENT_QUERY, {
    variables: { id, hospitalId: meData?.me?.hospitalId },
    skip: !id,
  });
  const [addDocument] = useMutation(ADD_PATIENT_DOCUMENT_MUTATION);
  const [deleteDocument] = useMutation(DELETE_PATIENT_DOCUMENT, { onCompleted: () => refetch() });
  const [updateStatus] = useMutation(UPDATE_PATIENT_STATUS, { onCompleted: () => refetch() });
  const [deletePatient] = useMutation(DELETE_PATIENT_MUTATION);
  const [linkAccount] = useMutation(LINK_PATIENT_ACCOUNT, { onCompleted: () => refetch() });
  const [unlinkAccount] = useMutation(UNLINK_PATIENT_ACCOUNT, { onCompleted: () => refetch() });
  const [cancelPrescription, { loading: cancellingRx }] = useMutation(
    CANCEL_PRESCRIPTION_MUTATION,
  );

  const handleStatusChange = async (newStatus: string) => {
    setMutationError('');
    try {
      await updateStatus({
        variables: { id, status: newStatus, hospitalId: meData?.me?.hospitalId },
      });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to update patient status');
      refetch();
    }
  };

  const handleLinkAccount = async () => {
    const patientEmail = data?.patient?.email;
    const email =
      window.prompt(
        'Portal user email to link (defaults to patient email)',
        patientEmail ?? '',
      ) ?? '';
    if (email === null && !patientEmail) return;
    setMutationError('');
    try {
      await linkAccount({
        variables: {
          patientId: id,
          hospitalId: meData?.me?.hospitalId,
          email: email || undefined,
        },
      });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to link portal account');
    }
  };

  const handleUnlinkAccount = async () => {
    if (!confirm('Unlink this portal account from the patient chart?')) return;
    setMutationError('');
    try {
      await unlinkAccount({
        variables: {
          patientId: id,
          hospitalId: meData?.me?.hospitalId,
        },
      });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to unlink portal account');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setMutationError('');
    try {
      await deleteDocument({
        variables: {
          id: documentId,
          patientId: id,
          hospitalId: meData?.me?.hospitalId,
        },
      });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const handleDeletePatient = async () => {
    if (!confirm('Soft-delete this patient?')) return;
    setMutationError('');
    try {
      await deletePatient({
        variables: { id, hospitalId: meData?.me?.hospitalId },
      });
      window.location.href = '/patients';
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to delete patient');
    }
  };

  const vitalsQuery = useQuery(PATIENT_VITALS_QUERY, {
    variables: { patientId: id, hospitalId: meData?.me?.hospitalId },
    skip: !id || !meData?.me?.hospitalId,
  });
  const notesQuery = useQuery(PATIENT_NOTES_QUERY, {
    variables: { patientId: id, hospitalId: meData?.me?.hospitalId },
    skip: !id || !meData?.me?.hospitalId,
  });
  const diagnosesQuery = useQuery(PATIENT_DIAGNOSES_QUERY, {
    variables: { patientId: id, hospitalId: meData?.me?.hospitalId },
    skip: !id || !meData?.me?.hospitalId,
  });
  const rxQuery = useQuery(PATIENT_PRESCRIPTIONS_QUERY, {
    variables: { patientId: id, hospitalId: meData?.me?.hospitalId },
    skip: !id || !meData?.me?.hospitalId,
  });
  const dischargesQuery = useQuery(DISCHARGES_QUERY, {
    variables: { patientId: id, hospitalId: meData?.me?.hospitalId },
    skip: !id || !meData?.me?.hospitalId,
  });

  const patient = data?.patient;
  const roles: string[] = meData?.me?.roles ?? [];
  const permissions: string[] = meData?.me?.permissions ?? [];
  const canWritePatients = canWritePatientDemographics(roles, permissions);
  const canDischarge = canWritePatients && canDischargePatients(roles);
  const canLinkPortal = canWritePatients && canAdminPatients(roles);
  const canCancelRx =
    permissions.includes('patients:write') && canActAsClinician(roles);

  const handleCancelPrescription = async (prescriptionId: string) => {
    if (!confirm('Cancel this pending prescription?')) return;
    setMutationError('');
    try {
      await cancelPrescription({
        variables: {
          hospitalId: meData?.me?.hospitalId,
          input: { prescriptionId },
        },
      });
      await rxQuery.refetch();
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : 'Failed to cancel prescription',
      );
    }
  };

  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
  ).replace(/\/graphql\/?$/, '');

  const handleOpenDocument = async (fileUrl: string) => {
    const token = await getToken();
    // Only fetch same-origin upload paths — never send the Clerk JWT to arbitrary URLs
    let pathname: string;
    try {
      pathname = fileUrl.startsWith('/uploads/')
        ? fileUrl.split('?')[0] ?? fileUrl
        : new URL(fileUrl, apiBase).pathname;
    } catch {
      setUploadError('Invalid document URL');
      return;
    }
    if (!/^\/uploads\/[^/]+$/.test(pathname) || pathname.includes('..')) {
      setUploadError('Invalid document URL');
      return;
    }
    const res = await fetch(`${apiBase}${pathname}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      setUploadError('Unable to open document');
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    // Revoke after the browser has a chance to load the tab
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch(`${apiBase}/uploads/patient-documents`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }
      const uploaded = (await uploadRes.json()) as { url: string; fileType?: string };

      await addDocument({
        variables: {
          patientId: id,
          hospitalId: meData?.me?.hospitalId,
          input: {
            name: file.name,
            fileUrl: uploaded.url,
            fileType: uploaded.fileType || file.type,
            documentType,
          },
        },
      });
      refetch();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p className="text-clay-text-muted">Loading patient...</p>;
  if (patientError) {
    return (
      <div className="py-8">
        <QueryError
          message="We could not load this patient. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }
  if (!patient) return <p className="text-clay-error">Patient not found</p>;

  return (
    <div>
      <DashboardHeader
        title={patient.fullName}
        subtitle={`Patient since ${new Date(patient.createdAt).toLocaleDateString()}`}
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <ClayBadge>{patient.status}</ClayBadge>
        {patient.gender && <ClayBadge variant="info">{patient.gender}</ClayBadge>}
        {patient.bloodGroup && <ClayBadge variant="warning">{patient.bloodGroup}</ClayBadge>}
        {canWritePatients ? (
        <Link href={`/patients/${id}/edit`}>
          <ClayButton variant="secondary" size="sm">
            Edit
          </ClayButton>
        </Link>
        ) : null}
        <Link href={`/patients/${id}/history`}>
          <ClayButton variant="secondary" size="sm">
            <History className="h-4 w-4" />
            Full History
          </ClayButton>
        </Link>
        {patient.status === 'admitted' && canDischarge ? (
          <Link href={`/patients/${id}/discharge`}>
            <ClayButton size="sm">Discharge</ClayButton>
          </Link>
        ) : null}
        {canWritePatients ? (
          <select
            aria-label="Update patient status"
            className="rounded-2xl border border-white/60 bg-clay-surface px-3 py-2 text-sm shadow-clay-inset"
            value={patient.status}
            onChange={(e) => {
              const next = e.target.value;
              if (!(EDITABLE_PATIENT_STATUSES as readonly string[]).includes(next)) {
                return;
              }
              handleStatusChange(next);
            }}
          >
            {/* Show current admission/discharge status as read-only context when applicable */}
            {!(EDITABLE_PATIENT_STATUSES as readonly string[]).includes(patient.status) ? (
              <option value={patient.status} disabled>
                {patient.status.replace(/_/g, ' ')} (via admission/discharge)
              </option>
            ) : null}
            {EDITABLE_PATIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        ) : null}
        {canLinkPortal && !patient.userId ? (
          <ClayButton
            size="sm"
            variant="ghost"
            onClick={handleLinkAccount}
          >
            Link portal account
          </ClayButton>
        ) : null}
        {canLinkPortal && patient.userId ? (
          <ClayButton
            size="sm"
            variant="ghost"
            onClick={handleUnlinkAccount}
          >
            Unlink portal account
          </ClayButton>
        ) : null}
        {canLinkPortal ? (
          <ClayButton
            size="sm"
            variant="ghost"
            onClick={handleDeletePatient}
          >
            Delete
          </ClayButton>
        ) : null}
      </div>

      {mutationError ? (
        <p className="mb-4 text-sm text-clay-error">{mutationError}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <ClayCard className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Demographics</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ['Email', patient.email],
              ['Phone', patient.phone],
              ['Date of Birth', patient.dateOfBirth],
              ['Occupation', patient.occupation],
              ['Address', [patient.address, patient.city, patient.state].filter(Boolean).join(', ')],
              ['Primary Care Physician', patient.primaryCarePhysician],
              ['ID Type', patient.identificationType],
              ['ID Number', patient.identificationNumber],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs font-medium text-clay-text-muted">{label}</dt>
                <dd className="text-sm text-clay-text">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </ClayCard>

        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Emergency Contact</h2>
          {patient.emergencyContacts?.length ? (
            patient.emergencyContacts.map((c: { id: string; name: string; phone: string; relationship?: string }) => (
              <div key={c.id} className="text-sm">
                <p className="font-medium text-clay-text">{c.name}</p>
                <p className="text-clay-text-muted">{c.phone}</p>
                {c.relationship && <p className="text-clay-text-muted">{c.relationship}</p>}
              </div>
            ))
          ) : (
            <p className="text-sm text-clay-text-muted">No emergency contact</p>
          )}
        </ClayCard>

        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Insurance</h2>
          <p className="text-sm text-clay-text">{patient.insuranceProvider ?? '—'}</p>
          <p className="text-sm text-clay-text-muted">{patient.insurancePolicyNumber ?? ''}</p>
        </ClayCard>

        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Allergies</h2>
          {patient.allergies?.length ? (
            <ul className="space-y-1">
              {patient.allergies.map((a: string) => (
                <li key={a} className="text-sm text-clay-error">• {a}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-clay-text-muted">None recorded</p>
          )}
        </ClayCard>

        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Medications</h2>
          {patient.medications?.length ? (
            <ul className="space-y-1">
              {patient.medications.map((m: string) => (
                <li key={m} className="text-sm text-clay-text">• {m}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-clay-text-muted">None recorded</p>
          )}
        </ClayCard>

        <ClayCard className="lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-clay-text">Documents</h2>
            {canWritePatients ? (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="rounded-2xl border border-white/60 bg-clay-surface px-4 py-2 text-sm text-clay-text shadow-clay-inset outline-none"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-clay-surface px-4 py-2 text-sm font-medium text-clay-primary shadow-clay-sm hover:shadow-clay">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  />
                </label>
              </div>
            ) : null}
          </div>
          {uploadError ? <p className="mb-4 text-sm text-clay-error">{uploadError}</p> : null}
          {patient.documents?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {patient.documents.map((d: { id: string; name: string; fileUrl: string }) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-2xl bg-clay-primary-light/30 p-3"
                >
                  <button
                    type="button"
                    onClick={() => handleOpenDocument(d.fileUrl)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-80"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-clay-primary" />
                    <span className="truncate text-sm text-clay-text">{d.name}</span>
                  </button>
                  {canWritePatients ? (
                    <ClayButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteDocument(d.id)}
                    >
                      Delete
                    </ClayButton>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-clay-text-muted">No documents uploaded</p>
          )}
        </ClayCard>

        <ClayCard className="lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Clinical chart</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-clay-text">Vitals</h3>
              {vitalsQuery.error ? (
                <QueryError
                  message="We could not load vitals."
                  onRetry={() => void vitalsQuery.refetch()}
                  className="text-left"
                />
              ) : (vitalsQuery.data?.vitalSigns ?? []).length === 0 ? (
                <p className="text-sm text-clay-text-muted">None yet</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(vitalsQuery.data?.vitalSigns ?? []).slice(0, 5).map(
                    (v: {
                      id: string;
                      bloodPressure?: string;
                      heartRate?: number;
                      recordedAt: string;
                    }) => (
                      <li key={v.id} className="text-clay-text-muted">
                        {new Date(v.recordedAt).toLocaleString()} — BP {v.bloodPressure ?? '—'} · HR{' '}
                        {v.heartRate ?? '—'}
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-clay-text">Diagnoses</h3>
              {diagnosesQuery.error ? (
                <QueryError
                  message="We could not load diagnoses."
                  onRetry={() => void diagnosesQuery.refetch()}
                  className="text-left"
                />
              ) : (diagnosesQuery.data?.diagnoses ?? []).length === 0 ? (
                <p className="text-sm text-clay-text-muted">None yet</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(diagnosesQuery.data?.diagnoses ?? []).map(
                    (d: { id: string; description: string; icdCode?: string }) => (
                      <li key={d.id} className="text-clay-text">
                        {d.icdCode ? `${d.icdCode}: ` : ''}
                        {d.description}
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-clay-text">Notes</h3>
              {notesQuery.error ? (
                <QueryError
                  message="We could not load clinical notes."
                  onRetry={() => void notesQuery.refetch()}
                  className="text-left"
                />
              ) : (notesQuery.data?.clinicalNotes ?? []).length === 0 ? (
                <p className="text-sm text-clay-text-muted">None yet</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(notesQuery.data?.clinicalNotes ?? []).slice(0, 3).map(
                    (n: { id: string; assessment?: string; createdAt: string }) => (
                      <li key={n.id} className="text-clay-text-muted">
                        {new Date(n.createdAt).toLocaleDateString()}: {n.assessment || 'SOAP note'}
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-clay-text">Prescriptions</h3>
              {rxQuery.error ? (
                <QueryError
                  message="We could not load prescriptions."
                  onRetry={() => void rxQuery.refetch()}
                  className="text-left"
                />
              ) : (rxQuery.data?.prescriptions ?? []).length === 0 ? (
                <p className="text-sm text-clay-text-muted">None yet</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(rxQuery.data?.prescriptions ?? []).map(
                    (p: {
                      id: string;
                      status: string;
                      items?: Array<{ drugName: string }>;
                    }) => (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-clay-text"
                      >
                        <span>
                          {p.items?.map((i) => i.drugName).join(', ') || 'Rx'} ({p.status})
                        </span>
                        {canCancelRx && p.status === 'pending' ? (
                          <ClayButton
                            size="sm"
                            variant="ghost"
                            isLoading={cancellingRx}
                            onClick={() => void handleCancelPrescription(p.id)}
                          >
                            Cancel
                          </ClayButton>
                        ) : null}
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
          </div>
        </ClayCard>

        <ClayCard className="lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Discharge summaries</h2>
          {dischargesQuery.error ? (
            <QueryError
              message="We could not load discharge summaries."
              onRetry={() => void dischargesQuery.refetch()}
              className="text-left"
            />
          ) : (dischargesQuery.data?.discharges ?? []).length === 0 ? (
            <p className="text-sm text-clay-text-muted">No discharges recorded</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {(dischargesQuery.data?.discharges ?? []).map(
                (d: {
                  id: string;
                  summary?: string;
                  dischargedAt: string;
                  instructions?: string;
                }) => (
                  <li key={d.id} className="rounded-2xl bg-clay-primary-light/20 px-3 py-2">
                    <p className="font-medium text-clay-text">
                      {new Date(d.dischargedAt).toLocaleString()}
                    </p>
                    <p className="text-clay-text-muted">{d.summary || 'No summary'}</p>
                    {d.instructions ? (
                      <p className="mt-1 text-xs text-clay-text-muted">{d.instructions}</p>
                    ) : null}
                  </li>
                ),
              )}
            </ul>
          )}
        </ClayCard>

        <ClayCard className="lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Consents</h2>
          <div className="flex flex-wrap gap-3">
            {patient.consents?.map((c: { id: string; consentType: string; granted: boolean }) => (
              <ClayBadge key={c.id} variant={c.granted ? 'success' : 'error'}>
                {c.consentType.replace(/_/g, ' ')}: {c.granted ? 'Granted' : 'Not granted'}
              </ClayBadge>
            ))}
          </div>
        </ClayCard>

        <PatientClinicalActions patientId={id} hospitalId={meData?.me?.hospitalId} />
      </div>
    </div>
  );
}
