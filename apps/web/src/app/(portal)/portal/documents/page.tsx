'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useAuth } from '@clerk/nextjs';
import { FileText } from 'lucide-react';
import { ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PortalQueryError } from '@/components/portal/portal-query-error';
import { PORTAL_PATIENT_RECORDS_QUERY } from '@/lib/graphql/queries';

export default function PortalDocumentsPage() {
  const { getToken } = useAuth();
  const [fileError, setFileError] = useState('');
  const { data, loading, error, refetch } = useQuery(PORTAL_PATIENT_RECORDS_QUERY);
  const patient = data?.portalPatientRecords?.patient;
  const documents = data?.portalPatientRecords?.documents ?? [];

  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
  ).replace(/\/graphql\/?$/, '');

  const handleOpenDocument = async (fileUrl: string) => {
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
      setFileError('Unable to open document');
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };

  return (
    <div>
      <DashboardHeader title="Documents" subtitle="Files shared from your care team" />

      {fileError ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">{fileError}</p>
      ) : null}

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading documents...</p>
        ) : error ? (
          <div className="px-6 py-8">
            <PortalQueryError onRetry={() => refetch()} />
          </div>
        ) : !patient ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">
            No linked patient record found.
          </p>
        ) : documents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
            <p className="text-clay-text-muted">No documents available yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {documents.map(
              (doc: {
                id: string;
                fileName: string;
                fileUrl: string;
                fileType?: string;
                createdAt: string;
              }) => (
                <div key={doc.id} className="flex items-center gap-4 px-6 py-4">
                  <FileText className="h-5 w-5 shrink-0 text-clay-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-clay-text">{doc.fileName}</p>
                    <p className="text-xs text-clay-text-muted">
                      {doc.fileType ? `${doc.fileType} · ` : ''}
                      {new Date(doc.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <ClayButton
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleOpenDocument(doc.fileUrl)}
                  >
                    Download
                  </ClayButton>
                </div>
              ),
            )}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
