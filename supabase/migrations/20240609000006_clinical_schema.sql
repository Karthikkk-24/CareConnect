-- Phase 3 clinical workflow schema

CREATE TYPE appointment_status AS ENUM ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show');
CREATE TYPE admission_status AS ENUM ('active', 'discharged', 'transferred');
CREATE TYPE bed_status AS ENUM ('available', 'occupied', 'maintenance');
CREATE TYPE prescription_status AS ENUM ('pending', 'dispensed', 'cancelled');
CREATE TYPE lab_order_status AS ENUM ('ordered', 'collected', 'processing', 'completed', 'cancelled');

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  floor VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL,
  status bed_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  attending_doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  discharged_at TIMESTAMPTZ,
  reason TEXT,
  status admission_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vital_signs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  blood_pressure VARCHAR(20),
  heart_rate INT,
  temperature NUMERIC(4,1),
  spo2 INT,
  weight NUMERIC(6,2),
  height NUMERIC(6,2),
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE diagnoses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  icd_code VARCHAR(20),
  description TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  diagnosed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clinical_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status prescription_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prescription_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  drug_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  duration VARCHAR(100),
  instructions TEXT
);

CREATE TABLE lab_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL,
  ordered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  test_name VARCHAR(255) NOT NULL,
  status lab_order_status NOT NULL DEFAULT 'ordered',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lab_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  result_value TEXT,
  reference_range VARCHAR(100),
  unit VARCHAR(50),
  result_file_url TEXT,
  entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_admissions_hospital ON admissions(hospital_id);
CREATE INDEX idx_admissions_status ON admissions(status);
CREATE INDEX idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX idx_prescriptions_hospital ON prescriptions(hospital_id);
CREATE INDEX idx_lab_orders_hospital ON lab_orders(hospital_id);
CREATE INDEX idx_beds_ward ON beds(ward_id);

CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER admissions_updated_at BEFORE UPDATE ON admissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER prescriptions_updated_at BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER lab_orders_updated_at BEFORE UPDATE ON lab_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
