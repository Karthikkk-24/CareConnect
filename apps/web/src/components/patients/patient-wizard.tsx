'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPatientSchema, type CreatePatientInput } from '@careconnect/types';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';

const STEPS = ['Personal', 'Contact', 'Medical', 'Insurance', 'Consent'];

interface PatientWizardProps {
  onSubmit: (data: CreatePatientInput) => Promise<void>;
  isLoading?: boolean;
  defaultValues?: Partial<CreatePatientInput>;
  submitLabel?: string;
}

export function PatientWizard({
  onSubmit,
  isLoading,
  defaultValues,
  submitLabel = 'Register Patient',
}: PatientWizardProps) {
  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors },
  } = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      emergencyContacts: [{ name: '', phone: '' }],
      allergies: [{ allergen: '' }],
      medications: [{ name: '' }],
      medicalHistory: [{ type: 'past', condition: '' }],
      consents: [
        { consentType: 'treatment', granted: false },
        { consentType: 'data_sharing', granted: false },
        { consentType: 'research', granted: false },
      ],
      ...defaultValues,
    },
  });

  const allergies = useFieldArray({ control, name: 'allergies' });
  const medications = useFieldArray({ control, name: 'medications' });
  const history = useFieldArray({ control, name: 'medicalHistory' });

  const nextStep = async () => {
    const fields: (keyof CreatePatientInput)[][] = [
      ['fullName', 'dateOfBirth', 'gender', 'occupation'],
      ['email', 'phone', 'address', 'city', 'state', 'zipCode'],
      ['primaryCarePhysician', 'allergies', 'medications', 'medicalHistory'],
      ['insurance'],
      ['consents'],
    ];

    const valid = await trigger(fields[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <ClayCard className="max-w-3xl">
      <div
        className="mb-8 flex gap-2"
        role="list"
        aria-label="Registration steps"
      >
        {STEPS.map((label, i) => (
          <div
            key={label}
            role="listitem"
            aria-current={i === step ? 'step' : undefined}
            aria-label={`Step ${i + 1}: ${label}`}
            className={`flex-1 rounded-2xl px-3 py-2 text-center text-xs font-medium ${
              i === step
                ? 'bg-clay-primary text-white shadow-clay-sm'
                : i < step
                  ? 'bg-clay-primary-light text-clay-primary'
                  : 'bg-clay-bg text-clay-text-muted'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <ClayInput label="Full Name *" error={errors.fullName?.message} {...register('fullName')} />
            <ClayInput label="Date of Birth" type="date" {...register('dateOfBirth')} />
            <div className="flex flex-col gap-2">
              <label htmlFor="patient-gender" className="text-sm font-medium text-clay-text">
                Gender
              </label>
              <select
                id="patient-gender"
                className="w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 shadow-clay-inset outline-none focus-visible:ring-2 focus-visible:ring-clay-primary/30"
                {...register('gender')}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <ClayInput label="Blood Group" {...register('bloodGroup')} />
            <ClayInput label="Occupation" {...register('occupation')} />
            <ClayInput label="Identification Type" {...register('identificationType')} />
            <ClayInput label="Identification Number" {...register('identificationNumber')} />
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <ClayInput label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <ClayInput label="Phone" type="tel" {...register('phone')} />
            <ClayInput label="Address" className="md:col-span-2" {...register('address')} />
            <ClayInput label="City" {...register('city')} />
            <ClayInput label="State" {...register('state')} />
            <ClayInput label="Zip Code" {...register('zipCode')} />
            <ClayInput label="Country" {...register('country')} />
            <ClayInput label="Emergency Contact Name" {...register('emergencyContacts.0.name')} />
            <ClayInput label="Emergency Contact Phone" {...register('emergencyContacts.0.phone')} />
            <ClayInput label="Relationship" {...register('emergencyContacts.0.relationship')} />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <ClayInput label="Primary Care Physician" {...register('primaryCarePhysician')} />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-clay-text">Allergies</label>
                <button
                  type="button"
                  onClick={() => allergies.append({ allergen: '' })}
                  className="text-sm text-clay-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-primary"
                  aria-label="Add allergy"
                >
                  + Add
                </button>
              </div>
              {allergies.fields.map((field, i) => (
                <div key={field.id} className="mb-2 grid gap-2 md:grid-cols-2">
                  <ClayInput placeholder="Allergen" {...register(`allergies.${i}.allergen`)} />
                  <ClayInput placeholder="Severity" {...register(`allergies.${i}.severity`)} />
                  <ClayInput placeholder="Reaction" {...register(`allergies.${i}.reaction`)} />
                  <ClayInput placeholder="Notes" {...register(`allergies.${i}.notes`)} />
                </div>
              ))}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-clay-text">Current Medications</label>
                <button
                  type="button"
                  onClick={() => medications.append({ name: '' })}
                  className="text-sm text-clay-primary"
                >
                  + Add
                </button>
              </div>
              {medications.fields.map((field, i) => (
                <div key={field.id} className="mb-2 grid gap-2 md:grid-cols-2">
                  <ClayInput placeholder="Medication name" {...register(`medications.${i}.name`)} />
                  <ClayInput placeholder="Dosage" {...register(`medications.${i}.dosage`)} />
                  <ClayInput placeholder="Frequency" {...register(`medications.${i}.frequency`)} />
                  <ClayInput placeholder="Prescriber" {...register(`medications.${i}.prescriber`)} />
                </div>
              ))}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-clay-text">Medical History</label>
                <button
                  type="button"
                  onClick={() => history.append({ type: 'past', condition: '' })}
                  className="text-sm text-clay-primary"
                >
                  + Add
                </button>
              </div>
              {history.fields.map((field, i) => (
                <div key={field.id} className="mb-2 grid gap-2 md:grid-cols-2">
                  <select
                    className="rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 shadow-clay-inset"
                    {...register(`medicalHistory.${i}.type`)}
                  >
                    <option value="past">Past</option>
                    <option value="family">Family</option>
                    <option value="surgical">Surgical</option>
                  </select>
                  <ClayInput placeholder="Condition" {...register(`medicalHistory.${i}.condition`)} />
                  <ClayInput
                    label="Diagnosis date"
                    type="date"
                    {...register(`medicalHistory.${i}.diagnosisDate`)}
                  />
                  <ClayInput placeholder="Relation" {...register(`medicalHistory.${i}.relation`)} />
                  <ClayInput
                    className="md:col-span-2"
                    placeholder="Notes"
                    {...register(`medicalHistory.${i}.notes`)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 md:grid-cols-2">
            <ClayInput label="Insurance Provider" {...register('insurance.provider')} />
            <ClayInput label="Policy Number" {...register('insurance.policyNumber')} />
            <ClayInput label="Group Number" {...register('insurance.groupNumber')} />
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <label
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-clay-primary-light/30 p-4"
              >
                <input type="hidden" {...register(`consents.${i}.consentType`)} />
                <input type="checkbox" {...register(`consents.${i}.granted`)} className="h-5 w-5 rounded" />
                <span className="text-sm text-clay-text">
                  I consent to{' '}
                  <strong>
                    {i === 0 ? 'treatment' : i === 1 ? 'data sharing' : 'research'}
                  </strong>
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-between">
          <ClayButton
            type="button"
            variant="secondary"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
          >
            Back
          </ClayButton>
          {step < STEPS.length - 1 ? (
            <ClayButton type="button" onClick={nextStep}>
              Continue
            </ClayButton>
          ) : (
            <ClayButton type="submit" isLoading={isLoading}>
              {submitLabel}
            </ClayButton>
          )}
        </div>
      </form>
    </ClayCard>
  );
}
