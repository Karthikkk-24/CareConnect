-- Normalize phone uniqueness to digits-only so format variants collide.
DROP INDEX IF EXISTS idx_patients_hospital_phone_unique;

CREATE UNIQUE INDEX idx_patients_hospital_phone_unique
  ON patients (hospital_id, (regexp_replace(phone, '[^0-9]', '', 'g')))
  WHERE deleted_at IS NULL
    AND phone IS NOT NULL
    AND phone <> ''
    AND regexp_replace(phone, '[^0-9]', '', 'g') <> '';
