'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import type { StaffInput } from '@careconnect/types';
import { ForbiddenAccess } from '@/components/auth/forbidden-access';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { StaffForm } from '@/components/staff/staff-form';
import { ME_QUERY, UPDATE_STAFF_MUTATION } from '@/lib/graphql/queries';

const STAFF_MEMBER_QUERY = gql`
  query StaffMember($id: String!) {
    staffMember(id: $id) {
      id
      fullName
      email
      phone
      roleSlug
      department
      specialization
    }
  }
`;

export default function EditStaffPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading: fetching } = useQuery(STAFF_MEMBER_QUERY, {
    variables: { id },
  });

  const [updateStaff, { loading }] = useMutation(UPDATE_STAFF_MUTATION);

  const canWriteStaff = (meData?.me?.permissions ?? []).includes('staff:write');

  const handleSubmit = async (input: StaffInput) => {
    setError('');
    try {
      await updateStaff({
        variables: {
          id,
          input: {
            fullName: input.fullName,
            phone: input.phone,
            roleSlug: input.roleSlug,
            department: input.department,
            specialization: input.specialization,
          },
        },
      });
      router.push('/staff');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff member');
    }
  };

  if (!meData?.me) {
    return null;
  }

  if (!canWriteStaff) {
    return (
      <ForbiddenAccess message="You do not have permission to edit staff members." />
    );
  }

  if (fetching) {
    return <p className="text-clay-text-muted">Loading...</p>;
  }

  const member = data?.staffMember;

  return (
    <div>
      <DashboardHeader title="Edit Staff Member" subtitle={member?.fullName} />
      {error ? <p className="mb-4 text-sm text-clay-error">{error}</p> : null}
      <StaffForm
        defaultValues={member}
        onSubmit={handleSubmit}
        isLoading={loading}
        submitLabel="Update Staff Member"
      />
    </div>
  );
}
