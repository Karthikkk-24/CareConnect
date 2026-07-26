'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { ArrowLeft } from 'lucide-react';
import { ClayBadge, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  DISCHARGES_QUERY,
  LAB_ORDERS_QUERY,
  ME_QUERY,
  PATIENT_DIAGNOSES_QUERY,
  PATIENT_NOTES_QUERY,
  PATIENT_PRESCRIPTIONS_QUERY,
  PATIENT_QUERY,
  PATIENT_VITALS_QUERY,
  ACTIVE_ADMISSIONS_QUERY,
} from '@/lib/graphql/queries';

type TimelineItem = {
  id: string;
  kind: string;
  title: string;
  detail?: string;
  at: string;
};

export default function PatientHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data, loading } = useQuery(PATIENT_QUERY, {
    variables: { id, hospitalId },
    skip: !id,
  });
  const vitalsQuery = useQuery(PATIENT_VITALS_QUERY, {
    variables: { patientId: id, hospitalId },
    skip: !id || !hospitalId,
  });
  const notesQuery = useQuery(PATIENT_NOTES_QUERY, {
    variables: { patientId: id, hospitalId },
    skip: !id || !hospitalId,
  });
  const diagnosesQuery = useQuery(PATIENT_DIAGNOSES_QUERY, {
    variables: { patientId: id, hospitalId },
    skip: !id || !hospitalId,
  });
  const rxQuery = useQuery(PATIENT_PRESCRIPTIONS_QUERY, {
    variables: { patientId: id, hospitalId },
    skip: !id || !hospitalId,
  });
  const dischargesQuery = useQuery(DISCHARGES_QUERY, {
    variables: { patientId: id, hospitalId },
    skip: !id || !hospitalId,
  });
  const admissionsQuery = useQuery(ACTIVE_ADMISSIONS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });
  const labOrdersQuery = useQuery(LAB_ORDERS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const patient = data?.patient;

  if (loading) return <p className="text-clay-text-muted">Loading...</p>;
  if (!patient) return <p className="text-clay-error">Patient not found</p>;

  const items: TimelineItem[] = [];

  for (const h of patient.medicalHistory ?? []) {
    items.push({
      id: `mh-${h.id}`,
      kind: h.type ?? 'history',
      title: h.condition,
      detail: [h.relation, h.notes].filter(Boolean).join(' · ') || undefined,
      at: h.diagnosisDate ?? h.createdAt,
    });
  }

  for (const v of vitalsQuery.data?.vitalSigns ?? []) {
    items.push({
      id: `v-${v.id}`,
      kind: 'vitals',
      title: `BP ${v.bloodPressure ?? '—'} · HR ${v.heartRate ?? '—'}`,
      detail: [
        v.temperature != null ? `Temp ${v.temperature}` : null,
        v.weight != null ? `Wt ${v.weight}` : null,
        v.spo2 != null ? `SpO2 ${v.spo2}%` : null,
      ]
        .filter(Boolean)
        .join(' · ') || undefined,
      at: v.recordedAt,
    });
  }

  for (const n of notesQuery.data?.clinicalNotes ?? []) {
    items.push({
      id: `n-${n.id}`,
      kind: 'note',
      title: 'Clinical note',
      detail: n.subjective || n.assessment || n.plan || undefined,
      at: n.createdAt,
    });
  }

  for (const d of diagnosesQuery.data?.diagnoses ?? []) {
    items.push({
      id: `dx-${d.id}`,
      kind: 'diagnosis',
      title: d.description ?? d.icdCode ?? 'Diagnosis',
      detail: d.icdCode ? `Code ${d.icdCode}` : undefined,
      at: d.diagnosedAt ?? d.createdAt,
    });
  }

  for (const rx of rxQuery.data?.prescriptions ?? []) {
    const drugs = (rx.items ?? []).map((i: { drugName: string }) => i.drugName).join(', ');
    items.push({
      id: `rx-${rx.id}`,
      kind: 'prescription',
      title: drugs || 'Prescription',
      detail: rx.status,
      at: rx.createdAt,
    });
  }

  for (const d of dischargesQuery.data?.discharges ?? []) {
    items.push({
      id: `dc-${d.id}`,
      kind: 'discharge',
      title: 'Discharge summary',
      detail: d.summary || d.instructions || undefined,
      at: d.dischargedAt ?? d.createdAt,
    });
  }

  for (const a of admissionsQuery.data?.activeAdmissions ?? []) {
    if (a.patientId !== id && a.patient?.id !== id) continue;
    items.push({
      id: `adm-${a.id}`,
      kind: 'admission',
      title: 'Active admission',
      detail: [a.ward?.name, a.bed?.label, a.reason].filter(Boolean).join(' · ') || undefined,
      at: a.admittedAt,
    });
  }

  for (const order of labOrdersQuery.data?.labOrders ?? []) {
    if (order.patientId !== id && order.patient?.id !== id) continue;
    items.push({
      id: `lab-${order.id}`,
      kind: 'lab',
      title: order.testName ?? 'Lab order',
      detail: order.status,
      at: order.createdAt,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div>
      <Link
        href={`/patients/${id}`}
        className="mb-4 inline-flex items-center gap-2 text-sm text-clay-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to patient
      </Link>

      <DashboardHeader
        title="Clinical History"
        subtitle={`Timeline for ${patient.fullName}`}
      />

      <ClayCard>
        {items.length === 0 ? (
          <p className="text-sm text-clay-text-muted">No clinical history recorded yet.</p>
        ) : (
          <div className="relative space-y-6 before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-clay-primary/20">
            {items.map((entry) => (
              <div key={entry.id} className="relative pl-12">
                <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full bg-clay-primary shadow-clay-sm" />
                <div className="rounded-2xl bg-clay-primary-light/30 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <ClayBadge>{entry.kind}</ClayBadge>
                    <span className="text-xs text-clay-text-muted">
                      {new Date(entry.at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-clay-text">{entry.title}</h3>
                  {entry.detail ? (
                    <p className="mt-1 text-sm text-clay-text-muted">{entry.detail}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
