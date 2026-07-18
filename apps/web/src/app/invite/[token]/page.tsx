'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { useAuth } from '@clerk/nextjs';
import { ClayButton, ClayCard } from '@careconnect/ui';
import { ACCEPT_STAFF_INVITE } from '@/lib/graphql/queries';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [acceptInvite, { loading }] = useMutation(ACCEPT_STAFF_INVITE);

  const handleAccept = async () => {
    setError('');
    setSuccess('');

    try {
      const { data } = await acceptInvite({ variables: { token } });
      setSuccess(`Welcome, ${data.acceptStaffInvite.fullName}! Redirecting to dashboard...`);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    }
  };

  const invitePath = `/invite/${token}`;

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clay-bg px-6">
        <p className="text-clay-text-muted">Loading invite...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-clay-bg px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-primary-light to-clay-primary text-lg font-bold text-white shadow-clay-sm">
          CC
        </div>
        <span className="text-2xl font-bold text-clay-text">CareConnect</span>
      </Link>

      <ClayCard className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-bold text-clay-text">Staff Invitation</h1>
        <p className="mb-6 text-sm text-clay-text-muted">
          You&apos;ve been invited to join a hospital team on CareConnect.
        </p>

        {!isSignedIn ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-clay-text">
              Sign in or create an account with the email address that received this invite.
            </p>
            <Link href={`/login?redirect=${encodeURIComponent(invitePath)}`}>
              <ClayButton className="w-full">Sign In</ClayButton>
            </Link>
            <Link href={`/register?redirect=${encodeURIComponent(invitePath)}`}>
              <ClayButton variant="secondary" className="w-full">
                Create Account
              </ClayButton>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error ? <p className="text-sm text-clay-error">{error}</p> : null}
            {success ? <p className="text-sm text-clay-success">{success}</p> : null}
            <ClayButton onClick={handleAccept} isLoading={loading} className="w-full">
              Accept Invitation
            </ClayButton>
          </div>
        )}
      </ClayCard>
    </div>
  );
}
