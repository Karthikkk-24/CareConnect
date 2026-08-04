'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { QueryError } from '@/components/query-error';
import {
  DELETE_STAFF_MUTATION,
  ME_QUERY,
  STAFF_MEMBERS_QUERY,
  UPDATE_STAFF_MUTATION,
} from '@/lib/graphql/queries';

export default function StaffPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading, error, refetch } = useQuery(STAFF_MEMBERS_QUERY, {
    variables: { hospitalId: meData?.me?.hospitalId },
    skip: !meData?.me?.hospitalId,
  });

  const [deleteStaff] = useMutation(DELETE_STAFF_MUTATION, {
    onCompleted: () => refetch(),
  });

  const [updateStaff] = useMutation(UPDATE_STAFF_MUTATION, {
    onCompleted: () => refetch(),
  });

  const staff = data?.staffMembers ?? [];
  const permissions = meData?.me?.permissions ?? [];
  const roles = meData?.me?.roles ?? [];
  const canWriteStaff = permissions.includes('staff:write');
  const canDeactivateStaff =
    canWriteStaff &&
    (roles.includes('hospital_admin') || roles.includes('super_admin'));
  const [actionError, setActionError] = useState('');

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    setActionError('');
    try {
      await deleteStaff({ variables: { id } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to deactivate staff member');
    }
  };

  const handleReactivate = async (id: string) => {
    setActionError('');
    try {
      await updateStaff({ variables: { id, input: { isActive: true } } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reactivate staff member');
    }
  };

  return (
    <div>
      <DashboardHeader title="Staff Management" subtitle="Manage your hospital team" />

      <div className="mb-6 flex justify-end">
        {canWriteStaff ? (
          <Link href="/staff/new">
            <ClayButton>
              <Plus className="h-4 w-4" />
              Add Staff
            </ClayButton>
          </Link>
        ) : null}
      </div>

      {actionError ? (
        <p className="mb-4 text-sm text-clay-error">{actionError}</p>
      ) : null}

      <ClayCard padding="none" className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/40 bg-clay-primary-light/30">
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Role</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Department</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Phone</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Specialization</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Status</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-clay-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-clay-text-muted">
                  Loading staff...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-6 py-8">
                  <QueryError
                    message="We could not load staff members. Please try again."
                    onRetry={() => void refetch()}
                  />
                </td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-clay-text-muted">
                  No staff members yet.
                  {canWriteStaff ? (
                    <>
                      {' '}
                      <Link href="/staff/new" className="text-clay-primary hover:underline">
                        Add your first team member
                      </Link>
                    </>
                  ) : null}
                </td>
              </tr>
            ) : (
              staff.map((member: {
                id: string;
                fullName: string;
                roleSlug: string;
                department?: string;
                phone?: string;
                specialization?: string;
                email: string;
                isActive: boolean;
              }) => (
                <tr key={member.id} className="border-b border-white/20 hover:bg-clay-primary-light/20">
                  <td className="px-6 py-4 text-sm font-medium text-clay-text">{member.fullName}</td>
                  <td className="px-6 py-4">
                    <ClayBadge>{member.roleSlug.replace(/_/g, ' ')}</ClayBadge>
                  </td>
                  <td className="px-6 py-4 text-sm text-clay-text-muted">
                    {member.department ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-clay-text-muted">{member.phone ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-clay-text-muted">
                    {member.specialization ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-clay-text-muted">{member.email}</td>
                  <td className="px-6 py-4">
                    <ClayBadge variant={member.isActive ? 'success' : 'error'}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </ClayBadge>
                  </td>
                  <td className="px-6 py-4">
                    {canWriteStaff ? (
                      <div className="flex justify-end gap-2">
                        <Link href={`/staff/${member.id}/edit`}>
                          <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-clay-primary-light text-clay-primary hover:shadow-clay-sm">
                            <Pencil className="h-4 w-4" />
                          </button>
                        </Link>
                        {member.isActive ? (
                          canDeactivateStaff ? (
                            <button
                              onClick={() => handleDelete(member.id, member.fullName)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-clay-error hover:shadow-clay-sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null
                        ) : (
                          <button
                            onClick={() => handleReactivate(member.id)}
                            title="Reactivate"
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-clay-primary-light text-clay-primary hover:shadow-clay-sm"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ClayCard>
    </div>
  );
}
