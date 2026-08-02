'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import type { StaffInput } from '@careconnect/types';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { ForbiddenAccess } from '@/components/auth/forbidden-access';
import { StaffForm } from '@/components/staff/staff-form';
import { CREATE_STAFF_MUTATION, ME_QUERY } from '@/lib/graphql/queries';

export default function NewStaffPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const { data: meData } = useQuery(ME_QUERY);
  const [createStaff, { loading }] = useMutation(CREATE_STAFF_MUTATION);

  const canWriteStaff = (meData?.me?.permissions ?? []).includes('staff:write');

  const handleSubmit = async (input: StaffInput) => {
    setError('');
    setInviteUrl('');
    try {
      const result = await createStaff({
        variables: {
          input,
          hospitalId: meData?.me?.hospitalId,
        },
      });
      const url = result.data?.createStaffMember?.inviteUrl as string | undefined;
      if (url) {
        setInviteUrl(url);
      } else {
        router.push('/staff');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create staff member');
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!meData?.me) {
    return null;
  }

  if (!canWriteStaff) {
    return (
      <ForbiddenAccess message="You do not have permission to add staff members." />
    );
  }

  if (inviteUrl) {
    return (
      <div>
        <DashboardHeader
          title="Staff invited"
          subtitle="Share this invite link so they can join your hospital"
        />
        <ClayCard className="max-w-xl space-y-4">
          <p className="text-sm text-clay-text-muted">
            An email invite may also have been sent via Clerk. Copy the CareConnect invite link below:
          </p>
          <ClayInput value={inviteUrl} readOnly aria-label="Invite URL" />
          <div className="flex gap-3">
            <ClayButton type="button" onClick={copyInvite}>
              {copied ? 'Copied' : 'Copy invite link'}
            </ClayButton>
            <ClayButton type="button" variant="secondary" onClick={() => router.push('/staff')}>
              Back to staff
            </ClayButton>
          </div>
        </ClayCard>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader title="Add Staff Member" subtitle="Create a new team member account" />
      {error ? <p className="mb-4 text-sm text-clay-error">{error}</p> : null}
      <StaffForm onSubmit={handleSubmit} isLoading={loading} submitLabel="Create Staff Member" />
    </div>
  );
}
