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
      inviteToken
      inviteUrl
    }
  }
`;

export const COMPLETE_PATIENT_ONBOARDING = gql`
  mutation CompletePatientOnboarding($fullName: String!) {
    completePatientOnboarding(fullName: $fullName) {
      id
      roles
      onboardingCompleted
    }
  }
`;

export const LINK_PATIENT_ACCOUNT = gql`
  mutation LinkPatientAccount($patientId: String!, $userId: String, $hospitalId: String) {
    linkPatientAccount(patientId: $patientId, userId: $userId, hospitalId: $hospitalId) {
      id
      fullName
      status
    }
  }
`;

export const CANCEL_APPOINTMENT_MUTATION = gql`
  mutation CancelAppointment($input: CancelAppointmentInput!, $hospitalId: String) {
    cancelAppointment(input: $input, hospitalId: $hospitalId) {
      id
      status
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

export const HOSPITAL_QUERY = gql`
  query Hospital($id: String!) {
    hospital(id: $id) {
      id
      name
      slug
      email
      phone
      address
      city
      country
      logoUrl
      isActive
      createdAt
    }
  }
`;

export const UPDATE_HOSPITAL_MUTATION = gql`
  mutation UpdateHospital($id: String!, $input: UpdateHospitalInput!) {
    updateHospital(id: $id, input: $input) {
      id
      name
      slug
      email
      phone
      address
      city
      country
      logoUrl
      isActive
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

export const UPDATE_PATIENT_MUTATION = gql`
  mutation UpdatePatient($id: String!, $input: CreatePatientInput!, $hospitalId: String) {
    updatePatient(id: $id, input: $input, hospitalId: $hospitalId) {
      id
      fullName
    }
  }
`;

export const DELETE_PATIENT_MUTATION = gql`
  mutation DeletePatient($id: String!, $hospitalId: String) {
    deletePatient(id: $id, hospitalId: $hospitalId)
  }
`;

export const UPDATE_PATIENT_STATUS = gql`
  mutation UpdatePatientStatus($id: String!, $status: String!, $hospitalId: String) {
    updatePatientStatus(id: $id, status: $status, hospitalId: $hospitalId) {
      id
      status
    }
  }
`;

export const DELETE_PATIENT_DOCUMENT = gql`
  mutation DeletePatientDocument(
    $patientId: String!
    $documentId: String!
    $hospitalId: String
  ) {
    deletePatientDocument(
      patientId: $patientId
      documentId: $documentId
      hospitalId: $hospitalId
    )
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
  mutation CompleteOnboarding(
    $fullName: String!
    $hospitalId: String
    $assignHospitalAdmin: Boolean
  ) {
    completeOnboarding(
      fullName: $fullName
      hospitalId: $hospitalId
      assignHospitalAdmin: $assignHospitalAdmin
    ) {
      id
      fullName
      onboardingCompleted
      hospitalId
      roles
    }
  }
`;

export const ACCEPT_STAFF_INVITE = gql`
  mutation AcceptStaffInvite($token: String!) {
    acceptStaffInvite(token: $token) {
      id
      fullName
      email
      hospitalId
      roleSlug
    }
  }
`;

export const DASHBOARD_STATS_QUERY = gql`
  query DashboardStats($hospitalId: String) {
    dashboardStats(hospitalId: $hospitalId) {
      appointmentsToday
      activeAdmissions
    }
  }
`;

export const APPOINTMENTS_QUERY = gql`
  query Appointments($hospitalId: String, $date: String, $status: String) {
    appointments(hospitalId: $hospitalId, date: $date, status: $status) {
      id
      patientId
      patient {
        id
        fullName
      }
      doctorId
      doctor {
        id
        fullName
      }
      scheduledAt
      reason
      status
      notes
      createdAt
    }
  }
`;

export const CREATE_APPOINTMENT_MUTATION = gql`
  mutation CreateAppointment($input: CreateAppointmentInput!, $hospitalId: String) {
    createAppointment(input: $input, hospitalId: $hospitalId) {
      id
      patientId
      scheduledAt
      reason
      status
    }
  }
`;

export const UPDATE_APPOINTMENT_STATUS_MUTATION = gql`
  mutation UpdateAppointmentStatus($id: String!, $status: String!, $hospitalId: String) {
    updateAppointmentStatus(id: $id, status: $status, hospitalId: $hospitalId) {
      id
      status
    }
  }
`;

export const ACTIVE_ADMISSIONS_QUERY = gql`
  query ActiveAdmissions($hospitalId: String) {
    activeAdmissions(hospitalId: $hospitalId) {
      id
      patientId
      patient {
        id
        fullName
      }
      wardId
      ward {
        id
        name
      }
      bedId
      bed {
        id
        label
      }
      reason
      status
      admittedAt
      dischargedAt
    }
  }
`;

export const ADMIT_PATIENT_MUTATION = gql`
  mutation AdmitPatient($input: AdmitPatientInput!, $hospitalId: String) {
    admitPatient(input: $input, hospitalId: $hospitalId) {
      id
      patientId
      status
      admittedAt
    }
  }
`;

export const DISCHARGE_ADMISSION_MUTATION = gql`
  mutation DischargeAdmission($id: String!, $hospitalId: String) {
    dischargeAdmission(input: { id: $id }, hospitalId: $hospitalId) {
      id
      status
      dischargedAt
    }
  }
`;

export const BED_OCCUPANCY_QUERY = gql`
  query WardOccupancy($hospitalId: String) {
    wardOccupancy(hospitalId: $hospitalId) {
      wardId
      wardName
      totalBeds
      occupiedBeds
      availableBeds
    }
  }
`;

export const DEPARTMENTS_QUERY = gql`
  query Departments($hospitalId: String) {
    departments(hospitalId: $hospitalId) {
      id
      name
      description
      createdAt
    }
  }
`;

export const WARDS_QUERY = gql`
  query Wards($hospitalId: String, $departmentId: String) {
    wards(hospitalId: $hospitalId, departmentId: $departmentId) {
      id
      name
      floor
      departmentId
      createdAt
    }
  }
`;

export const BEDS_QUERY = gql`
  query Beds($hospitalId: String, $wardId: String) {
    beds(hospitalId: $hospitalId, wardId: $wardId) {
      id
      label
      status
      wardId
      createdAt
    }
  }
`;

export const CREATE_DEPARTMENT_MUTATION = gql`
  mutation CreateDepartment($input: CreateDepartmentInput!, $hospitalId: String) {
    createDepartment(input: $input, hospitalId: $hospitalId) {
      id
      name
      description
    }
  }
`;

export const CREATE_WARD_MUTATION = gql`
  mutation CreateWard($input: CreateWardInput!, $hospitalId: String) {
    createWard(input: $input, hospitalId: $hospitalId) {
      id
      name
      floor
      departmentId
    }
  }
`;

export const CREATE_BED_MUTATION = gql`
  mutation CreateBed($input: CreateBedInput!, $hospitalId: String) {
    createBed(input: $input, hospitalId: $hospitalId) {
      id
      label
      status
      wardId
    }
  }
`;

export const CREATE_VITAL_SIGN_MUTATION = gql`
  mutation CreateVitalSign($input: CreateVitalInput!, $hospitalId: String) {
    createVitalSign(input: $input, hospitalId: $hospitalId) {
      id
      patientId
      bloodPressure
      heartRate
      temperature
      recordedAt
    }
  }
`;

export const CREATE_CLINICAL_NOTE_MUTATION = gql`
  mutation CreateClinicalNote($input: CreateClinicalNoteInput!, $hospitalId: String) {
    createClinicalNote(input: $input, hospitalId: $hospitalId) {
      id
      patientId
      subjective
      objective
      assessment
      plan
      createdAt
    }
  }
`;

export const CREATE_PRESCRIPTION_MUTATION = gql`
  mutation CreatePrescription($input: CreatePrescriptionInput!, $hospitalId: String) {
    createPrescription(input: $input, hospitalId: $hospitalId) {
      id
      patientId
      status
      createdAt
    }
  }
`;

export const LAB_ORDERS_QUERY = gql`
  query LabOrders($hospitalId: String, $status: String) {
    labOrders(hospitalId: $hospitalId, status: $status) {
      id
      patientId
      patient {
        id
        fullName
      }
      testName
      status
      notes
      createdAt
    }
  }
`;

export const CREATE_LAB_ORDER_MUTATION = gql`
  mutation CreateLabOrder($input: CreateLabOrderInput!, $hospitalId: String) {
    createLabOrder(input: $input, hospitalId: $hospitalId) {
      id
      patientId
      testName
      status
    }
  }
`;

export const COMPLETE_LAB_RESULT_MUTATION = gql`
  mutation CompleteLabResult($input: CompleteLabResultInput!, $hospitalId: String) {
    completeLabResult(input: $input, hospitalId: $hospitalId) {
      id
      labOrderId
      resultValue
      completedAt
    }
  }
`;

export const DISCHARGES_QUERY = gql`
  query Discharges($patientId: String!, $hospitalId: String) {
    discharges(patientId: $patientId, hospitalId: $hospitalId) {
      id
      admissionId
      patientId
      summary
      medicationsAtDischarge
      instructions
      dischargedAt
      createdAt
    }
  }
`;

export const CREATE_DISCHARGE_MUTATION = gql`
  mutation CreateDischarge($input: CreateDischargeInput!, $hospitalId: String) {
    createDischarge(input: $input, hospitalId: $hospitalId) {
      id
      admissionId
      patientId
      summary
      medicationsAtDischarge
      instructions
      dischargedAt
    }
  }
`;

export const FOLLOW_UPS_QUERY = gql`
  query FollowUps($hospitalId: String, $status: String) {
    followUps(hospitalId: $hospitalId, status: $status) {
      id
      patientId
      patientName
      doctorId
      doctorName
      dischargeId
      scheduledAt
      type
      status
      notes
      createdAt
    }
  }
`;

export const CREATE_FOLLOW_UP_MUTATION = gql`
  mutation CreateFollowUp($input: CreateFollowUpInput!, $hospitalId: String) {
    createFollowUp(input: $input, hospitalId: $hospitalId) {
      id
      patientId
      scheduledAt
      type
      status
    }
  }
`;

export const UPDATE_FOLLOW_UP_STATUS_MUTATION = gql`
  mutation UpdateFollowUpStatus($input: UpdateFollowUpStatusInput!, $hospitalId: String) {
    updateFollowUpStatus(input: $input, hospitalId: $hospitalId) {
      id
      status
      notes
    }
  }
`;

export const PORTAL_PATIENT_RECORDS_QUERY = gql`
  query PortalPatientRecords {
    portalPatientRecords {
      patient {
        id
        fullName
        email
        phone
        dateOfBirth
        gender
        bloodGroup
        status
      }
      appointments {
        id
        scheduledAt
        reason
        status
        notes
        createdAt
      }
      prescriptions {
        id
        status
        notes
        createdAt
        items {
          id
          drugName
          dosage
          frequency
          duration
          instructions
        }
      }
      labResults {
        id
        labOrderId
        testName
        resultValue
        referenceRange
        unit
        completedAt
        createdAt
      }
    }
  }
`;

export const INVOICES_QUERY = gql`
  query Invoices($hospitalId: String) {
    invoices(hospitalId: $hospitalId) {
      id
      patientId
      patient {
        id
        fullName
      }
      admissionId
      status
      totalAmount
      issuedAt
      createdAt
      items {
        id
        description
        quantity
        unitPrice
        amount
      }
      payments {
        id
        amount
        method
        paidAt
      }
    }
  }
`;

export const INVOICE_QUERY = gql`
  query Invoice($id: String!, $hospitalId: String) {
    invoice(id: $id, hospitalId: $hospitalId) {
      id
      patientId
      patient {
        id
        fullName
      }
      status
      totalAmount
      issuedAt
      items {
        id
        description
        quantity
        unitPrice
        amount
      }
      payments {
        id
        amount
        method
        paidAt
      }
    }
  }
`;

export const CREATE_INVOICE_MUTATION = gql`
  mutation CreateInvoice($input: CreateInvoiceInput!, $hospitalId: String) {
    createInvoice(input: $input, hospitalId: $hospitalId) {
      id
      status
      totalAmount
      createdAt
    }
  }
`;

export const RECORD_PAYMENT_MUTATION = gql`
  mutation RecordPayment($input: RecordPaymentInput!, $hospitalId: String) {
    recordPayment(input: $input, hospitalId: $hospitalId) {
      id
      status
      totalAmount
      payments {
        id
        amount
        method
        paidAt
      }
    }
  }
`;

export const INVENTORY_ITEMS_QUERY = gql`
  query InventoryItems($hospitalId: String) {
    inventoryItems(hospitalId: $hospitalId) {
      id
      name
      sku
      quantity
      unit
      reorderLevel
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_INVENTORY_ITEM_MUTATION = gql`
  mutation CreateInventoryItem($input: CreateInventoryItemInput!, $hospitalId: String) {
    createInventoryItem(input: $input, hospitalId: $hospitalId) {
      id
      name
      sku
      quantity
      unit
      reorderLevel
    }
  }
`;

export const UPDATE_INVENTORY_QUANTITY_MUTATION = gql`
  mutation UpdateInventoryQuantity($input: UpdateInventoryQuantityInput!, $hospitalId: String) {
    updateInventoryQuantity(input: $input, hospitalId: $hospitalId) {
      id
      quantity
    }
  }
`;

export const PHARMACY_STOCK_QUERY = gql`
  query PharmacyStock($hospitalId: String) {
    pharmacyStock(hospitalId: $hospitalId) {
      id
      drugName
      quantity
      unit
      updatedAt
    }
  }
`;

export const PENDING_PRESCRIPTIONS_QUERY = gql`
  query PendingPrescriptions($hospitalId: String) {
    pendingPrescriptions(hospitalId: $hospitalId) {
      id
      patientId
      patient {
        id
        fullName
      }
      status
      notes
      createdAt
      items {
        id
        drugName
        dosage
        frequency
        duration
        instructions
      }
    }
  }
`;

export const UPSERT_PHARMACY_STOCK_MUTATION = gql`
  mutation UpsertPharmacyStock($input: UpsertPharmacyStockInput!, $hospitalId: String) {
    upsertPharmacyStock(input: $input, hospitalId: $hospitalId) {
      id
      drugName
      quantity
      unit
    }
  }
`;

export const DISPENSE_PRESCRIPTION_MUTATION = gql`
  mutation DispensePrescription($input: DispensePrescriptionInput!, $hospitalId: String) {
    dispensePrescription(input: $input, hospitalId: $hospitalId) {
      id
      status
    }
  }
`;

export const HOSPITAL_REPORTS_QUERY = gql`
  query HospitalReports($hospitalId: String) {
    hospitalReports(hospitalId: $hospitalId) {
      patientCount
      staffCount
      appointmentsToday
      activeAdmissions
      revenueTotal
    }
  }
`;
