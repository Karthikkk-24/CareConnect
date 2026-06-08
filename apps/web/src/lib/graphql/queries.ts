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
