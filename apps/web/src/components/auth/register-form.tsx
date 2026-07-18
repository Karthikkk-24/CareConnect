'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSignUp } from '@clerk/nextjs';
import { registerSchema, type RegisterInput } from '@careconnect/types';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingCode, setPendingCode] = useState(false);
  const [code, setCode] = useState('');

  const redirectTo = searchParams.get('redirect') ?? '/onboarding';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { accountType: 'hospital' },
  });

  const accountType = watch('accountType');

  const onSubmit = async (data: RegisterInput) => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');

    try {
      const attempt = await signUp.create({
        emailAddress: data.email,
        password: data.password,
        unsafeMetadata: {
          fullName: data.fullName,
          accountType: data.accountType,
          hospitalName: data.hospitalName,
        },
      });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.push(redirectTo);
        router.refresh();
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingCode(true);
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push(redirectTo);
        router.refresh();
      } else {
        setError('Verification incomplete. Try again.');
      }
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const signUpWithGoogle = async () => {
    if (!isLoaded) return;
    setError('');
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/auth/callback',
        redirectUrlComplete: redirectTo,
      });
    } catch (err) {
      setError(extractClerkError(err));
    }
  };

  if (pendingCode) {
    return (
      <ClayCard className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-bold text-clay-text">Check your email</h1>
        <p className="mb-6 text-sm text-clay-text-muted">
          We sent a verification code to your inbox. Enter it below to activate your account.
        </p>
        <div className="flex flex-col gap-4">
          <ClayInput
            label="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          {error ? <p className="text-sm text-clay-error">{error}</p> : null}
          <ClayButton onClick={verifyCode} isLoading={loading} className="w-full">
            Verify email
          </ClayButton>
        </div>
      </ClayCard>
    );
  }

  return (
    <ClayCard className="w-full max-w-md">
      <h1 className="mb-2 text-2xl font-bold text-clay-text">Create your account</h1>
      <p className="mb-6 text-sm text-clay-text-muted">Start managing your hospital with CareConnect</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-clay-text">Account Type</label>
          <select
            className="w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-clay-text shadow-clay-inset outline-none focus:ring-2 focus:ring-clay-primary/30"
            {...register('accountType')}
          >
            <option value="hospital">Hospital Administrator</option>
            <option value="staff">Staff Member</option>
            <option value="patient">Patient</option>
          </select>
        </div>

        <ClayInput
          label="Full Name"
          placeholder="Dr. Jane Smith"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        {accountType === 'hospital' ? (
          <ClayInput
            label="Hospital Name"
            placeholder="City General Hospital"
            error={errors.hospitalName?.message}
            {...register('hospitalName')}
          />
        ) : null}

        <ClayInput
          label="Email"
          type="email"
          placeholder="you@hospital.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <ClayInput
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <ClayInput
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {error ? <p className="text-sm text-clay-error">{error}</p> : null}

        <ClayButton type="submit" className="w-full" isLoading={loading}>
          Create Account
        </ClayButton>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-clay-text-muted">
        <span className="h-px flex-1 bg-clay-text-muted/20" />
        <span>or</span>
        <span className="h-px flex-1 bg-clay-text-muted/20" />
      </div>

      <ClayButton type="button" variant="secondary" className="w-full" onClick={signUpWithGoogle}>
        Sign up with Google
      </ClayButton>

      <p className="mt-6 text-center text-sm text-clay-text-muted">
        Already have an account?{' '}
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
      return errors[0].longMessage ?? errors[0].message ?? 'Sign-up failed';
    }
  }
  return err instanceof Error ? err.message : 'Sign-up failed';
}
