'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

/**
 * Landing page for Clerk OAuth (Google, SSO, …) round-trips.
 * Clerk handles the token exchange internally; we just wait for it to
 * finalize the session, then it navigates to the configured URL.
 */
export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-clay-bg px-6">
      <p className="text-clay-text-muted">Finishing sign in…</p>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/onboarding"
      />
    </div>
  );
}
