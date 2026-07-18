'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { createClient } from '@/lib/supabase/client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    setError('');
    setSuccess('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/login`,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess('Check your email for a password reset link.');
    setLoading(false);
  };

  return (
    <ClayCard className="w-full max-w-md">
      <h1 className="mb-2 text-2xl font-bold text-clay-text">Reset your password</h1>
      <p className="mb-6 text-sm text-clay-text-muted">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <ClayInput
          label="Email"
          type="email"
          placeholder="you@hospital.com"
          error={errors.email?.message}
          {...register('email')}
        />

        {error ? <p className="text-sm text-clay-error">{error}</p> : null}
        {success ? <p className="text-sm text-clay-success">{success}</p> : null}

        <ClayButton type="submit" className="w-full" isLoading={loading}>
          Send Reset Link
        </ClayButton>
      </form>

      <p className="mt-6 text-center text-sm text-clay-text-muted">
        Remember your password?{' '}
        <Link href="/login" className="font-medium text-clay-primary hover:underline">
          Sign in
        </Link>
      </p>
    </ClayCard>
  );
}
