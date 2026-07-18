'use client';

import { useQuery } from '@apollo/client';
import { FlaskConical } from 'lucide-react';
import { ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PORTAL_PATIENT_RECORDS_QUERY } from '@/lib/graphql/queries';

export default function PortalLabResultsPage() {
  const { data, loading } = useQuery(PORTAL_PATIENT_RECORDS_QUERY);
  const patient = data?.portalPatientRecords?.patient;
  const labResults = data?.portalPatientRecords?.labResults ?? [];

  return (
    <div>
      <DashboardHeader title="Lab Results" subtitle="Completed laboratory test results" />

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading lab results...</p>
        ) : !patient ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">
            No linked patient record found.
          </p>
        ) : labResults.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FlaskConical className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
            <p className="text-clay-text-muted">No lab results available yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {labResults.map(
              (result: {
                id: string;
                testName: string;
                resultValue?: string;
                referenceRange?: string;
                unit?: string;
                completedAt?: string;
                createdAt: string;
              }) => (
                <div key={result.id} className="px-6 py-4">
                  <p className="font-medium text-clay-text">{result.testName}</p>
                  <p className="mt-1 text-sm text-clay-text">
                    {result.resultValue ?? 'Pending'}
                    {result.unit ? ` ${result.unit}` : ''}
                  </p>
                  {result.referenceRange ? (
                    <p className="text-sm text-clay-text-muted">
                      Reference: {result.referenceRange}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-clay-text-muted">
                    {result.completedAt
                      ? `Completed ${new Date(result.completedAt).toLocaleString()}`
                      : `Recorded ${new Date(result.createdAt).toLocaleString()}`}
                  </p>
                </div>
              ),
            )}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
