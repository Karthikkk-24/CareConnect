'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { useUser } from '@clerk/nextjs';
import { COMPLETE_PATIENT_ONBOARDING, ME_QUERY } from '@/lib/graphql/queries';
import { PortalSidebar } from '@/components/layout/portal-sidebar';

export function PortalLayoutClient({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { data, refetch } = useQuery(ME_QUERY);
  const [completePatientOnboarding] = useMutation(COMPLETE_PATIENT_ONBOARDING);
  const ran = useRef(false);

  useEffect(() => {
    const needsComplete =
      searchParams.get('completePatient') === '1' ||
      (data?.me &&
        !data.me.roles?.includes('patient') &&
        !data.me.onboardingCompleted &&
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
  }, [searchParams, data?.me, user, completePatientOnboarding, refetch]);

  return (
    <div className="flex min-h-screen gap-6 bg-clay-bg p-6 pt-16 lg:pt-6">
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
