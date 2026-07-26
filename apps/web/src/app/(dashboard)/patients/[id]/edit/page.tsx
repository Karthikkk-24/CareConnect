'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import type { CreatePatientInput } from '@careconnect/types';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PatientWizard } from '@/components/patients/patient-wizard';
import { ME_QUERY, PATIENT_QUERY, UPDATE_PATIENT_MUTATION } from '@/lib/graphql/queries';

type PatientDetail = {
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  occupation?: string;
  identificationType?: string;
  identificationNumber?: string;
  primaryCarePhysician?: string;
  emergencyContacts?: { name: string; phone: string; relationship?: string }[];
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  allergies?: string[];
  medications?: string[];
  medicationDetails?: {
    name: string;
    dosage?: string;
    frequency?: string;
    prescriber?: string;
  }[];
  medicalHistory?: {
    type: string;
    condition: string;
    diagnosisDate?: string;
    relation?: string;
    notes?: string;
  }[];
  consents?: { consentType: string; granted: boolean }[];
};

function patientToFormValues(patient: PatientDetail): Partial<CreatePatientInput> {
  return {
    fullName: patient.fullName,
    email: patient.email ?? '',
    phone: patient.phone,
    dateOfBirth: patient.dateOfBirth,
    gender: patient.gender as CreatePatientInput['gender'],
    bloodGroup: patient.bloodGroup,
    address: patient.address,
    city: patient.city,
    state: patient.state,
    zipCode: patient.zipCode,
    country: patient.country,
    occupation: patient.occupation,
    identificationType: patient.identificationType,
    identificationNumber: patient.identificationNumber,
    primaryCarePhysician: patient.primaryCarePhysician,
    emergencyContacts: patient.emergencyContacts?.length
      ? patient.emergencyContacts.map((c) => ({
          name: c.name,
          phone: c.phone,
          relationship: c.relationship,
        }))
      : [{ name: '', phone: '' }],
    insurance: {
      provider: patient.insuranceProvider,
      policyNumber: patient.insurancePolicyNumber,
    },
    allergies: patient.allergies?.length
      ? patient.allergies.map((a) => ({ allergen: a }))
      : [{ allergen: '' }],
    medications: patient.medicationDetails?.length
      ? patient.medicationDetails.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          prescriber: m.prescriber,
        }))
      : patient.medications?.length
        ? patient.medications.map((m) => {
            const match = m.match(/^(.*?)\s*\((.*)\)\s*$/);
            if (match) {
              return { name: match[1].trim(), dosage: match[2].trim() };
            }
            return { name: m };
          })
        : [{ name: '' }],
    medicalHistory: patient.medicalHistory?.length
      ? patient.medicalHistory.map((h) => ({
          type: h.type as 'past' | 'family' | 'surgical',
          condition: h.condition,
          diagnosisDate: h.diagnosisDate,
          relation: h.relation,
          notes: h.notes,
        }))
      : [{ type: 'past', condition: '' }],
    consents: patient.consents?.length
      ? patient.consents.map((c) => ({
          consentType: c.consentType as 'treatment' | 'data_sharing' | 'research',
          granted: c.granted,
        }))
      : undefined,
  };
}

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading: fetching } = useQuery(PATIENT_QUERY, {
    variables: { id, hospitalId: meData?.me?.hospitalId },
    skip: !id,
  });

  const [updatePatient, { loading }] = useMutation(UPDATE_PATIENT_MUTATION);

  const handleSubmit = async (input: CreatePatientInput) => {
    setError('');
    try {
      await updatePatient({
        variables: { id, input, hospitalId: meData?.me?.hospitalId },
      });
      router.push(`/patients/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update patient');
    }
  };

  if (fetching) {
    return <p className="text-clay-text-muted">Loading patient...</p>;
  }

  const patient = data?.patient;
  if (!patient) {
    return <p className="text-clay-error">Patient not found</p>;
  }

  return (
    <div>
      <DashboardHeader title="Edit Patient" subtitle={patient.fullName} />
      {error ? <p className="mb-4 text-sm text-clay-error">{error}</p> : null}
      <PatientWizard
        defaultValues={patientToFormValues(patient)}
        onSubmit={handleSubmit}
        isLoading={loading}
        submitLabel="Save Changes"
      />
    </div>
  );
}
