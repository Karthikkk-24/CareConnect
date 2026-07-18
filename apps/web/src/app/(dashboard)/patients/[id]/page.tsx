'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { FileText, History, Upload } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { ADD_PATIENT_DOCUMENT_MUTATION, DELETE_PATIENT_MUTATION, LINK_PATIENT_ACCOUNT, ME_QUERY, PATIENT_QUERY, UPDATE_PATIENT_STATUS } from '@/lib/graphql/queries';
import { PatientClinicalActions } from '@/components/clinical/patient-clinical-actions';
import { useAuth } from '@clerk/nextjs';

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
  const [documentType, setDocumentType] = useState('identification');
  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading, refetch } = useQuery(PATIENT_QUERY, {
    variables: { id, hospitalId: meData?.me?.hospitalId },
    skip: !id,
  });
  const [addDocument] = useMutation(ADD_PATIENT_DOCUMENT_MUTATION);
  const [updateStatus] = useMutation(UPDATE_PATIENT_STATUS, { onCompleted: () => refetch() });
  const [deletePatient] = useMutation(DELETE_PATIENT_MUTATION);
  const [linkAccount] = useMutation(LINK_PATIENT_ACCOUNT, { onCompleted: () => refetch() });

  const patient = data?.patient;

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const token = await getToken();
      const apiBase =
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql').replace(
          /\/graphql\/?$/,
          '',
        );
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
        <Link href={`/patients/${id}/edit`}>
          <ClayButton variant="secondary" size="sm">
            Edit
          </ClayButton>
        </Link>
        <Link href={`/patients/${id}/history`}>
          <ClayButton variant="secondary" size="sm">
            <History className="h-4 w-4" />
            Full History
          </ClayButton>
        </Link>
        {patient.status === 'admitted' ? (
          <Link href={`/patients/${id}/discharge`}>
            <ClayButton size="sm">Discharge</ClayButton>
          </Link>
        ) : null}
        <select
          aria-label="Update patient status"
          className="rounded-2xl border border-white/60 bg-clay-surface px-3 py-2 text-sm shadow-clay-inset"
          value={patient.status}
          onChange={(e) =>
            updateStatus({
              variables: { id, status: e.target.value, hospitalId: meData?.me?.hospitalId },
            })
          }
        >
          {['registered', 'checked_in', 'admitted', 'discharged', 'inactive'].map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <ClayButton
          size="sm"
          variant="ghost"
          onClick={() =>
            linkAccount({
              variables: { patientId: id, hospitalId: meData?.me?.hospitalId },
            })
          }
        >
          Link my portal account
        </ClayButton>
        <ClayButton
          size="sm"
          variant="ghost"
          onClick={async () => {
            if (!confirm('Soft-delete this patient?')) return;
            await deletePatient({
              variables: { id, hospitalId: meData?.me?.hospitalId },
            });
            window.location.href = '/patients';
          }}
        >
          Delete
        </ClayButton>
      </div>

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
          </div>
          {uploadError ? <p className="mb-4 text-sm text-clay-error">{uploadError}</p> : null}
          {patient.documents?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {patient.documents.map((d: { id: string; name: string; fileUrl: string }) => (
                <a
                  key={d.id}
                  href={d.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl bg-clay-primary-light/30 p-3 hover:bg-clay-primary-light/50"
                >
                  <FileText className="h-5 w-5 text-clay-primary" />
                  <span className="text-sm text-clay-text">{d.name}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-clay-text-muted">No documents uploaded</p>
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
