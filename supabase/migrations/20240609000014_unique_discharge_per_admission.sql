-- One clinical discharge summary per admission
CREATE UNIQUE INDEX IF NOT EXISTS idx_discharges_admission_unique
  ON discharges (admission_id);
