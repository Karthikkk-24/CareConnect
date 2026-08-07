-- Each stored upload may be linked to at most one lab result.
-- Mirrors patient_documents.file_url uniqueness (20240609000024).
CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_results_result_file_url
  ON lab_results (result_file_url)
  WHERE result_file_url IS NOT NULL AND result_file_url <> '';
