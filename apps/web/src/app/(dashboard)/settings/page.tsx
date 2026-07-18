'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { HospitalForm } from '@/components/hospital/hospital-form';
import { HOSPITAL_QUERY, ME_QUERY, UPDATE_HOSPITAL_MUTATION } from '@/lib/graphql/queries';

export default function SettingsPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data, loading: fetching } = useQuery(HOSPITAL_QUERY, {
    variables: { id: hospitalId },
    skip: !hospitalId,
  });

  const [updateHospital, { loading }] = useMutation(UPDATE_HOSPITAL_MUTATION);

  const hospital = data?.hospital;

  const handleSubmit = async (input: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    logoUrl?: string;
  }) => {
    if (!hospitalId) return;

    setError('');
    setSuccess('');

    try {
      await updateHospital({
        variables: {
          id: hospitalId,
          input: {
            name: input.name,
            email: input.email || undefined,
            phone: input.phone || undefined,
            address: input.address || undefined,
            city: input.city || undefined,
            country: input.country || undefined,
            logoUrl: input.logoUrl || undefined,
          },
        },
      });
      setSuccess('Hospital profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update hospital profile');
    }
  };

  if (!hospitalId) {
    return (
      <div>
        <DashboardHeader title="Settings" subtitle="Hospital profile and preferences" />
        <p className="text-clay-text-muted">No hospital linked to your account yet.</p>
      </div>
    );
  }

  if (fetching) {
    return <p className="text-clay-text-muted">Loading settings...</p>;
  }

  return (
    <div>
      <DashboardHeader
        title="Settings"
        subtitle="Manage your hospital profile and preferences"
      />
      {error ? <p className="mb-4 text-sm text-clay-error">{error}</p> : null}
      {success ? <p className="mb-4 text-sm text-clay-success">{success}</p> : null}
      <HospitalForm
        defaultValues={hospital}
        onSubmit={handleSubmit}
        isLoading={loading}
        submitLabel="Save Hospital Profile"
      />
    </div>
  );
}
