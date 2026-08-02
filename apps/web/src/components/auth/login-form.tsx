'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSignIn } from '@clerk/nextjs';
import { loginSchema, type LoginInput } from '@careconnect/types';
import { useTranslations } from 'next-intl';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { safeInternalPath } from '@/lib/safe-redirect';

export function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = safeInternalPath(searchParams.get('redirect'), '/dashboard');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');

    try {
      const attempt = await signIn.create({
        identifier: data.email,
        password: data.password,
      });

      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.push(redirectTo);
        router.refresh();
      } else {
        setError('Additional verification is required. Please continue in a supported client.');
      }
    } catch (err) {
      setError(extractClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!isLoaded) return;
    setError('');
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/auth/callback',
        redirectUrlComplete: redirectTo,
      });
    } catch (err) {
      setError(extractClerkError(err));
    }
  };

  return (
    <ClayCard className="w-full max-w-md">
      <h1 className="mb-2 text-2xl font-bold text-clay-text">{t('welcomeBack')}</h1>
      <p className="mb-6 text-sm text-clay-text-muted">{t('signInSubtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <ClayInput
          label={t('email')}
          type="email"
          autoComplete="email"
          placeholder="you@hospital.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <ClayInput
          label={t('password')}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        {error ? (
          <p className="text-sm text-clay-error" role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}

        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-clay-primary hover:underline">
            {t('forgotPassword')}
          </Link>
        </div>

        <ClayButton
          type="submit"
          className="w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-primary"
          isLoading={loading}
          aria-busy={loading}
        >
          {t('signIn')}
        </ClayButton>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-clay-text-muted">
        <span className="h-px flex-1 bg-clay-text-muted/20" />
        <span>or</span>
        <span className="h-px flex-1 bg-clay-text-muted/20" />
      </div>

      <ClayButton
        type="button"
        variant="secondary"
        className="w-full"
        onClick={signInWithGoogle}
      >
        Continue with Google
      </ClayButton>

      <p className="mt-6 text-center text-sm text-clay-text-muted">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-medium text-clay-primary hover:underline">
          {t('createOne')}
        </Link>
      </p>
    </ClayCard>
  );
}

function extractClerkError(err: unknown): string {
  if (err && typeof err === 'object' && 'errors' in err) {
    const errors = (err as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors[0].longMessage ?? errors[0].message ?? 'Sign-in failed';
    }
  }
  return err instanceof Error ? err.message : 'Sign-in failed';
}
