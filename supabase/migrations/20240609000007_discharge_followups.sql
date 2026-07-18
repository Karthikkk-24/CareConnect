-- Phase 4: Discharge summaries, follow-ups, and patient portal linkage

ALTER TABLE patients
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX idx_patients_user_id ON patients(user_id) WHERE user_id IS NOT NULL;

CREATE TYPE follow_up_status AS ENUM ('scheduled', 'completed', 'missed', 'rescheduled');

CREATE TABLE discharges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  discharged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  summary TEXT,
  medications_at_discharge TEXT,
  instructions TEXT,
  discharged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  discharge_id UUID REFERENCES discharges(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  type VARCHAR(100),
  status follow_up_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discharges_hospital ON discharges(hospital_id);
CREATE INDEX idx_discharges_patient ON discharges(patient_id);
CREATE INDEX idx_discharges_admission ON discharges(admission_id);
CREATE INDEX idx_follow_ups_hospital ON follow_ups(hospital_id);
CREATE INDEX idx_follow_ups_patient ON follow_ups(patient_id);
CREATE INDEX idx_follow_ups_scheduled ON follow_ups(scheduled_at);
CREATE INDEX idx_follow_ups_status ON follow_ups(status);

CREATE TRIGGER discharges_updated_at BEFORE UPDATE ON discharges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER follow_ups_updated_at BEFORE UPDATE ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
