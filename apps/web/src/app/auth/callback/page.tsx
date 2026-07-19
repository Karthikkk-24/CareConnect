'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

/**
 * Landing page for Clerk OAuth (Google, SSO, …) round-trips.
 * Prefer redirectUrlComplete from the OAuth start; fall back to safe defaults
 * that do not override invite/portal destinations when Clerk still needs one.
 */
function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const inviteRedirect = searchParams.get('redirect');
  const signUpFallback =
    inviteRedirect && inviteRedirect.startsWith('/invite')
      ? inviteRedirect
      : '/onboarding';

  return (
    <div className="flex min-h-screen items-center justify-center bg-clay-bg px-6">
      <p className="text-clay-text-muted">Finishing sign in…</p>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl={signUpFallback}
      />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-clay-bg px-6">
          <p className="text-clay-text-muted">Finishing sign in…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
