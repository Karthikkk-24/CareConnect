'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useAuth } from '@clerk/nextjs';
import { FileText, FlaskConical } from 'lucide-react';
import { ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PortalQueryError } from '@/components/portal/portal-query-error';
import { PORTAL_PATIENT_RECORDS_QUERY } from '@/lib/graphql/queries';
import { getApiOrigin } from '@/lib/api-url';

export default function PortalLabResultsPage() {
  const { getToken } = useAuth();
  const [fileError, setFileError] = useState('');
  const { data, loading, error, refetch } = useQuery(PORTAL_PATIENT_RECORDS_QUERY);
  const patient = data?.portalPatientRecords?.patient;
  const labResults = data?.portalPatientRecords?.labResults ?? [];

  const apiBase = getApiOrigin();

  const handleOpenResultFile = async (fileUrl: string) => {
    setFileError('');
    const token = await getToken();
    let pathname: string;
    try {
      pathname = fileUrl.startsWith('/uploads/')
        ? fileUrl.split('?')[0] ?? fileUrl
        : new URL(fileUrl, apiBase).pathname;
    } catch {
      setFileError('Invalid document URL');
      return;
    }
    if (!/^\/uploads\/[^/]+$/.test(pathname) || pathname.includes('..')) {
      setFileError('Invalid document URL');
      return;
    }
    const res = await fetch(`${apiBase}${pathname}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      setFileError('Unable to open result file');
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };

  return (
    <div>
      <DashboardHeader title="Lab Results" subtitle="Completed laboratory test results" />

      {fileError ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">{fileError}</p>
      ) : null}

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading lab results...</p>
        ) : error ? (
          <div className="px-6 py-8">
            <PortalQueryError
              onRetry={() => refetch()}
            />
          </div>
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
                resultFileUrl?: string;
                completedAt?: string;
                createdAt: string;
              }) => (
                <div key={result.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
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
                  {result.resultFileUrl ? (
                    <ClayButton
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleOpenResultFile(result.resultFileUrl!)}
                    >
                      <FileText className="h-4 w-4" />
                      Download
                    </ClayButton>
                  ) : null}
                </div>
              ),
            )}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
