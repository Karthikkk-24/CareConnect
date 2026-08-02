-- Soft-deleted patients must not reserve portal user bindings.
-- Clear any leftover user_id on already soft-deleted rows, then replace
-- the unique index so only active charts participate.

UPDATE patients
SET user_id = NULL
WHERE deleted_at IS NOT NULL
  AND user_id IS NOT NULL;

DROP INDEX IF EXISTS idx_patients_user_id;

CREATE UNIQUE INDEX idx_patients_user_id
  ON patients (user_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;
