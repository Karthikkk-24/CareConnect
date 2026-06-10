import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      fullName
      hospitalId
      roles
      permissions
      onboardingCompleted
    }
  }
`;

export const STAFF_MEMBERS_QUERY = gql`
  query StaffMembers($hospitalId: String) {
    staffMembers(hospitalId: $hospitalId) {
      id
      userId
      hospitalId
      fullName
      email
      phone
      roleSlug
      department
      specialization
      isActive
      createdAt
    }
  }
`;

export const CREATE_STAFF_MUTATION = gql`
  mutation CreateStaffMember($input: CreateStaffInput!, $hospitalId: String) {
    createStaffMember(input: $input, hospitalId: $hospitalId) {
      id
      fullName
      email
      roleSlug
      department
    }
  }
`;

export const UPDATE_STAFF_MUTATION = gql`
  mutation UpdateStaffMember($id: String!, $input: UpdateStaffInput!) {
    updateStaffMember(id: $id, input: $input) {
      id
      fullName
      roleSlug
      department
      isActive
    }
  }
`;

export const DELETE_STAFF_MUTATION = gql`
  mutation DeleteStaffMember($id: String!) {
    deleteStaffMember(id: $id)
  }
`;

export const CREATE_HOSPITAL_MUTATION = gql`
  mutation CreateHospital($input: CreateHospitalInput!) {
    createHospital(input: $input) {
      id
      name
      slug
    }
  }
`;

export const PATIENTS_QUERY = gql`
  query Patients($page: Int, $limit: Int, $search: String, $hospitalId: String) {
    patients(page: $page, limit: $limit, search: $search, hospitalId: $hospitalId) {
      items {
        id
        fullName
        email
        phone
        dateOfBirth
        gender
        status
        createdAt
      }
      total
      page
      limit
    }
  }
`;

export const PATIENT_QUERY = gql`
  query Patient($id: String!, $hospitalId: String) {
    patient(id: $id, hospitalId: $hospitalId) {
      id
      fullName
      email
      phone
      dateOfBirth
      gender
      bloodGroup
      address
      city
      state
      zipCode
      country
      occupation
      identificationType
      identificationNumber
      primaryCarePhysician
      status
      createdAt
      emergencyContacts {
        id
        name
        phone
        relationship
      }
      insuranceProvider
      insurancePolicyNumber
      allergies
      medications
      medicalHistory {
        id
        type
        condition
        diagnosisDate
        relation
        notes
        createdAt
      }
      documents {
        id
        name
        fileUrl
        fileType
        documentType
        createdAt
      }
      consents {
        id
        consentType
        granted
        grantedAt
      }
    }
  }
`;

export const CREATE_PATIENT_MUTATION = gql`
  mutation CreatePatient($input: CreatePatientInput!, $hospitalId: String) {
    createPatient(input: $input, hospitalId: $hospitalId) {
      id
      fullName
    }
  }
`;

export const IMPORT_PATIENTS_MUTATION = gql`
  mutation ImportPatients($rows: [BulkPatientRowInput!]!, $dryRun: Boolean!, $hospitalId: String) {
    importPatients(rows: $rows, dryRun: $dryRun, hospitalId: $hospitalId) {
      totalRows
      successCount
      errorCount
      errors {
        row
        message
      }
      dryRun
    }
  }
`;

export const ADD_PATIENT_DOCUMENT_MUTATION = gql`
  mutation AddPatientDocument($patientId: String!, $input: PatientDocumentInput!, $hospitalId: String) {
    addPatientDocument(patientId: $patientId, input: $input, hospitalId: $hospitalId) {
      id
      name
      fileUrl
    }
  }
`;

export const COMPLETE_ONBOARDING_MUTATION = gql`
  mutation CompleteOnboarding($fullName: String!, $hospitalId: String) {
    completeOnboarding(fullName: $fullName, hospitalId: $hospitalId) {
      id
      fullName
      onboardingCompleted
      hospitalId
    }
  }
`;
