'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import type { CreatePatientInput } from '@careconnect/types';
import { ForbiddenAccess } from '@/components/auth/forbidden-access';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PatientWizard } from '@/components/patients/patient-wizard';
import { CREATE_PATIENT_MUTATION, ME_QUERY } from '@/lib/graphql/queries';
import { canWritePatientDemographics } from '@/lib/clinical-access';

export default function NewPatientPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const { data: meData } = useQuery(ME_QUERY);
  const [createPatient, { loading }] = useMutation(CREATE_PATIENT_MUTATION);

  const canWritePatients = canWritePatientDemographics(meData?.me?.roles, meData?.me?.permissions);

  const handleSubmit = async (input: CreatePatientInput) => {
    setError('');
    try {
      const { data } = await createPatient({
        variables: { input, hospitalId: meData?.me?.hospitalId },
      });
      router.push(`/patients/${data.createPatient.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register patient');
    }
  };

  if (!meData?.me) {
    return null;
  }

  if (!canWritePatients) {
    return (
      <ForbiddenAccess message="You do not have permission to register patients." />
    );
  }

  return (
    <div>
      <DashboardHeader title="Register Patient" subtitle="Complete the 5-step registration wizard" />
      {error ? <p className="mb-4 text-sm text-clay-error">{error}</p> : null}
      <PatientWizard onSubmit={handleSubmit} isLoading={loading} />
    </div>
  );
}
