-- At most one pending staff invite per hospital + email.
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_invites_pending_email
  ON staff_invites (hospital_id, LOWER(email))
  WHERE accepted_at IS NULL;
