-- Each stored upload may be linked to at most one patient document.
-- Existing relative paths are /uploads/<filename>; also cover legacy absolute URLs
-- by unique on the trailing filename expression is hard in PG without a generated
-- column, so enforce uniqueness on the stored file_url value (API always stores
-- relative /uploads/... now).
CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_documents_file_url
  ON patient_documents (file_url)
  WHERE file_url IS NOT NULL AND file_url <> '';
