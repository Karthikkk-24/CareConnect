-- Normalize pharmacy stock uniqueness to case-insensitive drug names.
-- Merge any existing case-variant duplicates, then replace the unique constraint.

WITH ranked AS (
  SELECT
    id,
    hospital_id,
    LOWER(drug_name) AS drug_key,
    quantity::numeric AS qty,
    ROW_NUMBER() OVER (
      PARTITION BY hospital_id, LOWER(drug_name)
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM pharmacy_stock
),
totals AS (
  SELECT hospital_id, drug_key, SUM(qty) AS total_qty
  FROM ranked
  GROUP BY hospital_id, drug_key
  HAVING COUNT(*) > 1
)
UPDATE pharmacy_stock ps
SET quantity = t.total_qty::numeric(12, 2)
FROM ranked r
JOIN totals t
  ON t.hospital_id = r.hospital_id
 AND t.drug_key = r.drug_key
WHERE ps.id = r.id
  AND r.rn = 1;

DELETE FROM pharmacy_stock ps
USING (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY hospital_id, LOWER(drug_name)
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM pharmacy_stock
) d
WHERE ps.id = d.id
  AND d.rn > 1;

ALTER TABLE pharmacy_stock
  DROP CONSTRAINT IF EXISTS pharmacy_stock_hospital_id_drug_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_stock_hospital_drug_lower
  ON pharmacy_stock (hospital_id, LOWER(drug_name));
