'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { useUser } from '@clerk/nextjs';
import { ClayButton, ClayCard } from '@careconnect/ui';
import { COMPLETE_PATIENT_ONBOARDING, ME_QUERY } from '@/lib/graphql/queries';
import { ForbiddenAccess } from '@/components/auth/forbidden-access';
import { PortalSidebar } from '@/components/layout/portal-sidebar';

export function PortalLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { data, loading, error, refetch } = useQuery(ME_QUERY, { errorPolicy: 'all' });
  const [completePatientOnboarding] = useMutation(COMPLETE_PATIENT_ONBOARDING);
  const ran = useRef(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingRetrying, setOnboardingRetrying] = useState(false);
  const me = data?.me;
  const roles: string[] = me?.roles ?? [];
  const isPatient = roles.includes('patient') || roles.includes('super_admin');
  const isStaff =
    roles.length > 0 &&
    !roles.includes('patient') &&
    me?.onboardingCompleted;

  useEffect(() => {
    // Staff/admin with completed onboarding must stay on the hospital dashboard
    if (isStaff) {
      router.replace('/dashboard');
    }
  }, [isStaff, router]);

  const runPatientOnboarding = async (fullName: string) => {
    setOnboardingError(null);
    setOnboardingRetrying(true);
    try {
      await completePatientOnboarding({ variables: { fullName } });
      await refetch();
    } catch (err) {
      setOnboardingError(
        err instanceof Error ? err.message : 'Failed to complete patient setup',
      );
    } finally {
      setOnboardingRetrying(false);
    }
  };

  useEffect(() => {
    const needsComplete =
      searchParams.get('completePatient') === '1' ||
      (me &&
        !me.roles?.includes('patient') &&
        !me.onboardingCompleted &&
        user?.unsafeMetadata?.accountType === 'patient');

    if (!needsComplete || ran.current || !user) return;
    ran.current = true;

    const fullName =
      (typeof user.unsafeMetadata?.fullName === 'string' && user.unsafeMetadata.fullName) ||
      user.fullName ||
      user.primaryEmailAddress?.emailAddress?.split('@')[0] ||
      'Patient';

    void runPatientOnboarding(fullName);
  }, [searchParams, me, user]);

  if (loading && !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clay-bg text-clay-text-muted">
        Loading portal…
      </div>
    );
  }

  if (error && !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clay-bg p-6">
        <ForbiddenAccess
          title="Unable to load portal"
          message="We could not verify your account. Please sign in again or contact support."
        />
      </div>
    );
  }

  if (isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clay-bg text-clay-text-muted">
        Redirecting to dashboard…
      </div>
    );
  }

  // Fail closed: non-patient authenticated users must not mount portal PHI pages.
  if (me && !isPatient && me.onboardingCompleted) {
    return <ForbiddenAccess />;
  }

  if (onboardingError) {
    const retryFullName =
      (typeof user?.unsafeMetadata?.fullName === 'string' && user.unsafeMetadata.fullName) ||
      user?.fullName ||
      user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
      'Patient';

    return (
      <div className="flex min-h-screen items-center justify-center bg-clay-bg p-6">
        <ClayCard className="max-w-md space-y-4 p-8 text-center">
          <h1 className="text-xl font-bold text-clay-text">Setup failed</h1>
          <p className="text-sm text-clay-error">{onboardingError}</p>
          <ClayButton
            type="button"
            isLoading={onboardingRetrying}
            onClick={() => void runPatientOnboarding(retryFullName)}
          >
            Try again
          </ClayButton>
        </ClayCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen gap-6 bg-clay-bg p-6">
      <a
        href="#portal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-clay-surface focus:px-4 focus:py-2"
      >
        Skip to main content
      </a>
      <PortalSidebar />
      <main id="portal-main" className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
