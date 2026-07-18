'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useMutation } from '@apollo/client';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { COMPLETE_ONBOARDING_MUTATION, CREATE_HOSPITAL_MUTATION } from '@/lib/graphql/queries';

type ClerkMeta = { hospitalName?: string; fullName?: string };

function suggestedName(user: NonNullable<ReturnType<typeof useUser>['user']>): string {
  const meta = user.unsafeMetadata as ClerkMeta | undefined;
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    (typeof meta?.fullName === 'string' ? meta.fullName : '')
  );
}

function suggestedHospital(user: NonNullable<ReturnType<typeof useUser>['user']>): string {
  const meta = user.unsafeMetadata as ClerkMeta | undefined;
  return typeof meta?.hospitalName === 'string' ? meta.hospitalName : '';
}

function OnboardingFormFields({
  initialFullName,
  initialHospitalName,
}: {
  initialFullName: string;
  initialHospitalName: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [hospitalName, setHospitalName] = useState(initialHospitalName);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [createHospital] = useMutation(CREATE_HOSPITAL_MUTATION);
  const [completeOnboarding] = useMutation(COMPLETE_ONBOARDING_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let hospitalId: string | undefined;

      if (hospitalName.trim()) {
        const { data } = await createHospital({
          variables: {
            input: { name: hospitalName.trim() },
          },
        });
        hospitalId = data?.createHospital?.id;
      }

      await completeOnboarding({
        variables: {
          fullName: fullName.trim(),
          hospitalId,
          assignHospitalAdmin: !!hospitalId,
        },
      });

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClayCard className="w-full max-w-lg">
      <h1 className="mb-2 text-2xl font-bold text-clay-text">Complete your setup</h1>
      <p className="mb-6 text-sm text-clay-text-muted">
        Tell us a bit more to personalize your CareConnect experience.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ClayInput
          label="Your Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <ClayInput
          label="Hospital Name"
          value={hospitalName}
          onChange={(e) => setHospitalName(e.target.value)}
          placeholder="City General Hospital"
        />

        {error ? <p className="text-sm text-clay-error">{error}</p> : null}

        <ClayButton type="submit" isLoading={loading}>
          Complete Setup
        </ClayButton>
      </form>
    </ClayCard>
  );
}

export function OnboardingForm() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <ClayCard className="w-full max-w-lg">
        <p className="text-sm text-clay-text-muted">Loading...</p>
      </ClayCard>
    );
  }

  if (!user) {
    return (
      <ClayCard className="w-full max-w-lg">
        <p className="text-sm text-clay-error">Sign in required to complete onboarding.</p>
      </ClayCard>
    );
  }

  return (
    <OnboardingFormFields
      key={user.id}
      initialFullName={suggestedName(user)}
      initialHospitalName={suggestedHospital(user)}
    />
  );
}
