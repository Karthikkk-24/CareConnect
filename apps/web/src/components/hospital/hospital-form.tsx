'use client';

import { useForm } from 'react-hook-form';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';

export interface HospitalFormValues {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  logoUrl?: string;
}

interface HospitalFormProps {
  defaultValues?: Partial<HospitalFormValues>;
  onSubmit: (data: HospitalFormValues) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function HospitalForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save Changes',
  isLoading,
  readOnly = false,
}: HospitalFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HospitalFormValues>({
    defaultValues: {
      name: '',
      ...defaultValues,
    },
  });

  return (
    <ClayCard className="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <ClayInput
          label="Hospital Name"
          error={errors.name?.message}
          disabled={readOnly}
          {...register('name', { required: 'Hospital name is required' })}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <ClayInput label="Email" type="email" disabled={readOnly} {...register('email')} />
          <ClayInput label="Phone" type="tel" disabled={readOnly} {...register('phone')} />
          <ClayInput
            label="Address"
            className="md:col-span-2"
            disabled={readOnly}
            {...register('address')}
          />
          <ClayInput label="City" disabled={readOnly} {...register('city')} />
          <ClayInput label="Country" disabled={readOnly} {...register('country')} />
          <ClayInput
            label="Logo URL"
            className="md:col-span-2"
            disabled={readOnly}
            {...register('logoUrl')}
          />
        </div>
        {readOnly ? null : (
          <ClayButton type="submit" isLoading={isLoading}>
            {submitLabel}
          </ClayButton>
        )}
      </form>
    </ClayCard>
  );
}
