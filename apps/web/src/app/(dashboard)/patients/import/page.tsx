'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { Download, Upload } from 'lucide-react';
import { ClayButton, ClayCard, ClayBadge } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { IMPORT_PATIENTS_MUTATION, ME_QUERY } from '@/lib/graphql/queries';
import { getCsvTemplate, parsePatientCsv } from '@/lib/csv-parser';

export default function ImportPatientsPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<ReturnType<typeof parsePatientCsv>>([]);
  const [result, setResult] = useState<{
    totalRows: number;
    successCount: number;
    errorCount: number;
    errors: { row: number; message: string }[];
    dryRun: boolean;
  } | null>(null);
  const { data: meData } = useQuery(ME_QUERY);
  const [importPatients, { loading }] = useMutation(IMPORT_PATIENTS_MUTATION);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setPreview(parsePatientCsv(text));
    setResult(null);
  };

  const runImport = async (dryRun: boolean) => {
    const { data } = await importPatients({
      variables: {
        rows: preview,
        dryRun,
        hospitalId: meData?.me?.hospitalId,
      },
    });
    setResult(data.importPatients);
    if (!dryRun && data.importPatients.errorCount === 0) {
      router.push('/patients');
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([getCsvTemplate()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <DashboardHeader title="Bulk Patient Import" subtitle="Upload a CSV file to import multiple patients" />

      <div className="grid gap-6 lg:grid-cols-2">
        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Upload CSV</h2>
          <p className="mb-4 text-sm text-clay-text-muted">
            Download the template, fill in patient data, and upload the file.
          </p>
          <ClayButton variant="secondary" onClick={downloadTemplate} className="mb-4">
            <Download className="h-4 w-4" />
            Download Template
          </ClayButton>
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-clay-primary/30 bg-clay-primary-light/20 p-8 hover:bg-clay-primary-light/40">
            <Upload className="h-8 w-8 text-clay-primary" />
            <span className="text-sm font-medium text-clay-primary">Choose CSV file</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          {preview.length > 0 && (
            <p className="mt-4 text-sm text-clay-text-muted">{preview.length} rows parsed</p>
          )}
        </ClayCard>

        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Preview & Import</h2>
          {preview.length === 0 ? (
            <p className="text-sm text-clay-text-muted">Upload a file to preview rows</p>
          ) : (
            <>
              <div className="mb-4 max-h-48 overflow-auto rounded-2xl bg-clay-bg p-3">
                {preview.slice(0, 5).map((row, i) => (
                  <div key={i} className="border-b border-white/20 py-2 text-sm last:border-0">
                    <strong>{row.fullName}</strong> — {row.email ?? row.phone ?? 'no contact'}
                  </div>
                ))}
                {preview.length > 5 && (
                  <p className="mt-2 text-xs text-clay-text-muted">+{preview.length - 5} more rows</p>
                )}
              </div>
              <div className="flex gap-3">
                <ClayButton variant="secondary" onClick={() => runImport(true)} isLoading={loading}>
                  Validate (Dry Run)
                </ClayButton>
                <ClayButton onClick={() => runImport(false)} isLoading={loading}>
                  Import Patients
                </ClayButton>
              </div>
            </>
          )}

          {result && (
            <div className="mt-6 rounded-2xl bg-clay-bg p-4">
              <div className="mb-3 flex gap-3">
                <ClayBadge variant="success">{result.successCount} success</ClayBadge>
                <ClayBadge variant={result.errorCount > 0 ? 'error' : 'default'}>
                  {result.errorCount} errors
                </ClayBadge>
                {result.dryRun && <ClayBadge variant="info">Dry run</ClayBadge>}
              </div>
              {result.errors.map((e) => (
                <p key={e.row} className="text-sm text-clay-error">
                  Row {e.row}: {e.message}
                </p>
              ))}
            </div>
          )}
        </ClayCard>
      </div>
    </div>
  );
}
