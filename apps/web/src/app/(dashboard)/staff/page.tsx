'use client';

import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { DELETE_STAFF_MUTATION, ME_QUERY, STAFF_MEMBERS_QUERY } from '@/lib/graphql/queries';

export default function StaffPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading, refetch } = useQuery(STAFF_MEMBERS_QUERY, {
    variables: { hospitalId: meData?.me?.hospitalId },
    skip: !meData?.me?.hospitalId,
  });

  const [deleteStaff] = useMutation(DELETE_STAFF_MUTATION, {
    onCompleted: () => refetch(),
  });

  const staff = data?.staffMembers ?? [];

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    await deleteStaff({ variables: { id } });
  };

  return (
    <div>
      <DashboardHeader title="Staff Management" subtitle="Manage your hospital team" />

      <div className="mb-6 flex justify-end">
        <Link href="/staff/new">
          <ClayButton>
            <Plus className="h-4 w-4" />
            Add Staff
          </ClayButton>
        </Link>
      </div>

      <ClayCard padding="none" className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/40 bg-clay-primary-light/30">
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Role</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Department</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Email</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-clay-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-clay-text-muted">
                  Loading staff...
                </td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-clay-text-muted">
                  No staff members yet.{' '}
                  <Link href="/staff/new" className="text-clay-primary hover:underline">
                    Add your first team member
                  </Link>
                </td>
              </tr>
            ) : (
              staff.map((member: {
                id: string;
                fullName: string;
                roleSlug: string;
                department?: string;
                email: string;
              }) => (
                <tr key={member.id} className="border-b border-white/20 hover:bg-clay-primary-light/20">
                  <td className="px-6 py-4 text-sm font-medium text-clay-text">{member.fullName}</td>
                  <td className="px-6 py-4">
                    <ClayBadge>{member.roleSlug.replace(/_/g, ' ')}</ClayBadge>
                  </td>
                  <td className="px-6 py-4 text-sm text-clay-text-muted">
                    {member.department ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-clay-text-muted">{member.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Link href={`/staff/${member.id}/edit`}>
                        <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-clay-primary-light text-clay-primary hover:shadow-clay-sm">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(member.id, member.fullName)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-clay-error hover:shadow-clay-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
