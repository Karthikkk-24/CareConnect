-- Phase 2: Patient management schema

CREATE TYPE patient_gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE patient_status AS ENUM ('registered', 'checked_in', 'admitted', 'discharged', 'inactive');
CREATE TYPE medical_history_type AS ENUM ('past', 'family', 'surgical');
CREATE TYPE consent_type AS ENUM ('treatment', 'data_sharing', 'research');
CREATE TYPE import_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Core patient record
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  date_of_birth DATE,
  gender patient_gender,
  blood_group VARCHAR(10),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100),
  occupation VARCHAR(100),
  identification_type VARCHAR(50),
  identification_number VARCHAR(100),
  primary_care_physician VARCHAR(255),
  status patient_status NOT NULL DEFAULT 'registered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE patient_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  relationship VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_insurance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider VARCHAR(255),
  policy_number VARCHAR(100),
  group_number VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_allergies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  allergen VARCHAR(255) NOT NULL,
  severity VARCHAR(50),
  reaction TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  prescriber VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_medical_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type medical_history_type NOT NULL,
  condition VARCHAR(255) NOT NULL,
  diagnosis_date DATE,
  relation VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  document_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consent_type consent_type NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status import_job_status NOT NULL DEFAULT 'pending',
  total_rows INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_full_name ON patients(full_name);
CREATE INDEX idx_patient_emergency_contacts_patient_id ON patient_emergency_contacts(patient_id);
CREATE INDEX idx_patient_medical_history_patient_id ON patient_medical_history(patient_id);
CREATE INDEX idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX idx_patient_import_jobs_hospital_id ON patient_import_jobs(hospital_id);

CREATE TRIGGER patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY patients_hospital_access ON patients
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM users WHERE auth_id = auth.uid())
  );
