'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@careconnect/types';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <ClayCard className="w-full max-w-md">
      <h1 className="mb-2 text-2xl font-bold text-clay-text">Welcome back</h1>
      <p className="mb-6 text-sm text-clay-text-muted">Sign in to your CareConnect account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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

        {error ? <p className="text-sm text-clay-error">{error}</p> : null}

        <ClayButton type="submit" className="w-full" isLoading={loading}>
          Sign In
        </ClayButton>
      </form>

      <p className="mt-6 text-center text-sm text-clay-text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-clay-primary hover:underline">
          Create one
        </Link>
      </p>
    </ClayCard>
  );
}
