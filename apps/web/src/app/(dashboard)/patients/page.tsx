'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Plus, Upload, Search } from 'lucide-react';
import { useState } from 'react';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { QueryError } from '@/components/query-error';
import { ME_QUERY, PATIENTS_QUERY } from '@/lib/graphql/queries';
import { canWritePatientDemographics } from '@/lib/clinical-access';

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading, error, refetch } = useQuery(PATIENTS_QUERY, {
    variables: {
      page,
      limit: 20,
      search: search || undefined,
      hospitalId: meData?.me?.hospitalId,
    },
    skip: !meData?.me?.hospitalId,
  });

  const patients = data?.patients?.items ?? [];
  const total = error ? 0 : (data?.patients?.total ?? 0);
  const canWritePatients = canWritePatientDemographics(meData?.me?.roles, meData?.me?.permissions);

  return (
    <div>
      <DashboardHeader
        title="Patients"
        subtitle={error ? 'Unable to load patients' : `${total} patients registered`}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-clay-text-muted" />
          <input
            type="search"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-2xl border border-white/60 bg-clay-surface py-3 pl-11 pr-4 shadow-clay-inset outline-none focus:ring-2 focus:ring-clay-primary/30"
          />
        </div>
        {canWritePatients ? (
          <div className="flex gap-3">
            <Link href="/patients/import">
              <ClayButton variant="secondary">
                <Upload className="h-4 w-4" />
                Bulk Import
              </ClayButton>
            </Link>
            <Link href="/patients/new">
              <ClayButton>
                <Plus className="h-4 w-4" />
                Add Patient
              </ClayButton>
            </Link>
          </div>
        ) : null}
      </div>

      <ClayCard padding="none" className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/40 bg-clay-primary-light/30">
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Contact</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">DOB</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-clay-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-clay-text-muted">Loading patients...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-6 py-8">
                  <QueryError
                    message="We could not load patients. Please try again."
                    onRetry={() => void refetch()}
                  />
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-clay-text-muted">
                  No patients found.
                  {canWritePatients ? (
                    <>
                      {' '}
                      <Link href="/patients/new" className="text-clay-primary hover:underline">
                        Register your first patient
                      </Link>
                    </>
                  ) : null}
                </td>
              </tr>
            ) : (
              patients.map((p: { id: string; fullName: string; email?: string; phone?: string; dateOfBirth?: string; status: string }) => (
                <tr key={p.id} className="border-b border-white/20 hover:bg-clay-primary-light/20">
                  <td className="px-6 py-4 text-sm font-medium text-clay-text">{p.fullName}</td>
                  <td className="px-6 py-4 text-sm text-clay-text-muted">
                    {p.email ?? p.phone ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-clay-text-muted">{p.dateOfBirth ?? '—'}</td>
                  <td className="px-6 py-4">
                    <ClayBadge variant={p.status === 'registered' ? 'default' : 'info'}>
                      {p.status}
                    </ClayBadge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/patients/${p.id}`} className="text-sm font-medium text-clay-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ClayCard>

      {total > 20 && (
        <div className="mt-4 flex justify-center gap-2">
          <ClayButton variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </ClayButton>
          <span className="flex items-center px-4 text-sm text-clay-text-muted">Page {page}</span>
          <ClayButton variant="secondary" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>
            Next
          </ClayButton>
        </div>
      )}
    </div>
  );
}
