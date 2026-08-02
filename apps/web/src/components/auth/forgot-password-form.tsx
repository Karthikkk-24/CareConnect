'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSignIn } from '@clerk/nextjs';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetSchema = z.object({
  code: z.string().min(4, 'Enter the code from your email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type EmailInput = z.infer<typeof emailSchema>;
type ResetInput = z.infer<typeof resetSchema>;

export function ForgotPasswordForm() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);

  const emailForm = useForm<EmailInput>({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm<ResetInput>({ resolver: zodResolver(resetSchema) });

  const requestReset = async (data: EmailInput) => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: data.email,
      });
      setAwaitingCode(true);
      setSuccess('Check your email for a verification code.');
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const completeReset = async (data: ResetInput) => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: data.code,
        password: data.password,
      });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        // Role-aware landing happens in dashboard/portal layouts after me loads.
        router.push('/onboarding');
        router.refresh();
      } else {
        setError('Reset incomplete. Please try again.');
      }
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClayCard className="w-full max-w-md">
      <h1 className="mb-2 text-2xl font-bold text-clay-text">Reset your password</h1>
      <p className="mb-6 text-sm text-clay-text-muted">
        Enter your email and we&apos;ll send you a code to reset your password.
      </p>

      {!awaitingCode ? (
        <form onSubmit={emailForm.handleSubmit(requestReset)} className="flex flex-col gap-4">
          <ClayInput
            label="Email"
            type="email"
            placeholder="you@hospital.com"
            error={emailForm.formState.errors.email?.message}
            {...emailForm.register('email')}
          />
          {error ? <p className="text-sm text-clay-error">{error}</p> : null}
          {success ? <p className="text-sm text-clay-success">{success}</p> : null}
          <ClayButton type="submit" className="w-full" isLoading={loading}>
            Send Reset Code
          </ClayButton>
        </form>
      ) : (
        <form onSubmit={resetForm.handleSubmit(completeReset)} className="flex flex-col gap-4">
          <ClayInput
            label="Verification code"
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            error={resetForm.formState.errors.code?.message}
            {...resetForm.register('code')}
          />
          <ClayInput
            label="New password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={resetForm.formState.errors.password?.message}
            {...resetForm.register('password')}
          />
          {error ? <p className="text-sm text-clay-error">{error}</p> : null}
          {success ? <p className="text-sm text-clay-success">{success}</p> : null}
          <ClayButton type="submit" className="w-full" isLoading={loading}>
            Set new password
          </ClayButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-clay-text-muted">
        Remember your password?{' '}
        <Link href="/login" className="font-medium text-clay-primary hover:underline">
          Sign in
        </Link>
      </p>
    </ClayCard>
  );
}

function extractClerkError(err: unknown): string {
  if (err && typeof err === 'object' && 'errors' in err) {
    const errors = (err as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors[0].longMessage ?? errors[0].message ?? 'Reset failed';
    }
  }
  return err instanceof Error ? err.message : 'Reset failed';
}
