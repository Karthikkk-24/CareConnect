'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { useUser } from '@clerk/nextjs';
import { COMPLETE_PATIENT_ONBOARDING, ME_QUERY } from '@/lib/graphql/queries';
import { PortalSidebar } from '@/components/layout/portal-sidebar';

export function PortalLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { data, loading, refetch } = useQuery(ME_QUERY);
  const [completePatientOnboarding] = useMutation(COMPLETE_PATIENT_ONBOARDING);
  const ran = useRef(false);
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

    completePatientOnboarding({ variables: { fullName } })
      .then(() => refetch())
      .catch(() => {
        ran.current = false;
      });
  }, [searchParams, me, user, completePatientOnboarding, refetch]);

  if (loading && !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clay-bg text-clay-text-muted">
        Loading portal…
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
        {!isPatient && me?.onboardingCompleted ? (
          <p className="mb-4 rounded-2xl bg-clay-warning/10 p-4 text-sm text-clay-text">
            Your account is not a patient portal user. If you are hospital staff, use the
            dashboard instead.
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}
