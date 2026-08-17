'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { staffSchema, type StaffInput, ROLES } from '@careconnect/types';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';

interface StaffFormProps {
  defaultValues?: Partial<StaffInput>;
  onSubmit: (data: StaffInput) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

const roleOptions = [
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.RECEPTIONIST,
  ROLES.LAB_TECHNICIAN,
  ROLES.PHARMACIST,
  ROLES.ACCOUNTANT,
  ROLES.HOSPITAL_MANAGER,
  ROLES.HOSPITAL_ADMIN,
];

export function StaffForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save Staff Member',
  isLoading,
}: StaffFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StaffInput>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      roleSlug: ROLES.DOCTOR,
      ...defaultValues,
    },
  });

  const selectedRole = watch('roleSlug');

  return (
    <ClayCard className="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <ClayInput
            label="Full Name"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <ClayInput label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <ClayInput label="Phone" error={errors.phone?.message} {...register('phone')} />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-clay-text">Role</label>
            <select
              className="w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-clay-text shadow-clay-inset outline-none focus:ring-2 focus:ring-clay-primary/30"
              {...register('roleSlug')}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            {selectedRole === ROLES.HOSPITAL_ADMIN ? (
              <p className="text-sm text-clay-text-muted">
                Invite a successor. The hospital_admin role transfers when they accept.
              </p>
            ) : null}
          </div>
          <ClayInput label="Department" error={errors.department?.message} {...register('department')} />
          <ClayInput
            label="Specialization"
            error={errors.specialization?.message}
            {...register('specialization')}
          />
        </div>
        <ClayButton type="submit" isLoading={isLoading}>
          {submitLabel}
        </ClayButton>
      </form>
    </ClayCard>
  );
}
