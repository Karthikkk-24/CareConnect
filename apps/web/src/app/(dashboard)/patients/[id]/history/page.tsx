'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { ArrowLeft } from 'lucide-react';
import { ClayBadge, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { QueryError } from '@/components/query-error';
import { ME_QUERY, PATIENT_QUERY } from '@/lib/graphql/queries';

export default function PatientHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading, error, refetch } = useQuery(PATIENT_QUERY, {
    variables: { id, hospitalId: meData?.me?.hospitalId },
  });

  const patient = data?.patient;

  if (loading) return <p className="text-clay-text-muted">Loading...</p>;
  if (error) {
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

  const history = patient.medicalHistory ?? [];

  return (
    <div>
      <Link href={`/patients/${id}`} className="mb-4 inline-flex items-center gap-2 text-sm text-clay-primary hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back to patient
      </Link>

      <DashboardHeader
        title="Medical History"
        subtitle={`Timeline for ${patient.fullName}`}
      />

      <ClayCard>
        {history.length === 0 ? (
          <p className="text-sm text-clay-text-muted">No medical history recorded yet.</p>
        ) : (
          <div className="relative space-y-6 before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-clay-primary/20">
            {history.map((entry: {
              id: string;
              type: string;
              condition: string;
              diagnosisDate?: string;
              relation?: string;
              notes?: string;
              createdAt: string;
            }) => (
              <div key={entry.id} className="relative pl-12">
                <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full bg-clay-primary shadow-clay-sm" />
                <div className="rounded-2xl bg-clay-primary-light/30 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <ClayBadge>{entry.type}</ClayBadge>
                    <span className="text-xs text-clay-text-muted">
                      {entry.diagnosisDate ?? new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-clay-text">{entry.condition}</h3>
                  {entry.relation && (
                    <p className="text-sm text-clay-text-muted">Relation: {entry.relation}</p>
                  )}
                  {entry.notes && <p className="mt-1 text-sm text-clay-text-muted">{entry.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
