'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useApolloClient } from '@apollo/client';
import { loginSchema, type LoginInput } from '@careconnect/types';
import { useTranslations } from 'next-intl';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { createClient } from '@/lib/supabase/client';
import { ME_QUERY } from '@/lib/graphql/queries';

export function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const apollo = useApolloClient();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get('redirect');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
      return;
    }

    try {
      const { data: meData } = await apollo.query({ query: ME_QUERY, fetchPolicy: 'network-only' });
      if (meData?.me && !meData.me.onboardingCompleted) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch {
      router.push('/dashboard');
    }
    router.refresh();
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

      <p className="mt-6 text-center text-sm text-clay-text-muted">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-medium text-clay-primary hover:underline">
          {t('createOne')}
        </Link>
      </p>
    </ClayCard>
  );
}
