-- Prevent concurrent double-occupancy and dual active admissions.
-- Application also uses SELECT FOR UPDATE; these indexes are the DB backstop.

CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_active_bed
  ON admissions (bed_id)
  WHERE status = 'active' AND bed_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_active_patient
  ON admissions (patient_id)
  WHERE status = 'active';
