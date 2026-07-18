'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@careconnect/types';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { createClient } from '@/lib/supabase/client';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get('redirect');

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
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          account_type: data.accountType,
          hospital_name: data.hospitalName,
        },
      },
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

    router.push('/onboarding');
    router.refresh();
  };

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

      <p className="mt-6 text-center text-sm text-clay-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-clay-primary hover:underline">
          Sign in
        </Link>
      </p>
    </ClayCard>
  );
}
