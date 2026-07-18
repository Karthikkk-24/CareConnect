-- Wave 1: Patient duplicate prevention within hospital scope
-- API-level checks are the primary guard; these partial unique indexes
-- enforce uniqueness for non-deleted patients at the database layer.

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_hospital_email_unique
  ON patients (hospital_id, LOWER(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_hospital_phone_unique
  ON patients (hospital_id, phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL AND phone <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_hospital_identification_unique
  ON patients (hospital_id, identification_number)
  WHERE deleted_at IS NULL
    AND identification_number IS NOT NULL
    AND identification_number <> '';
