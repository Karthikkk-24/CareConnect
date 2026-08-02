-- Integrity uniques for facility beds, consents, and inventory SKUs.
CREATE UNIQUE INDEX IF NOT EXISTS uq_beds_ward_label
  ON beds (ward_id, label);

CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_consents_type
  ON patient_consents (patient_id, consent_type);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_hospital_sku
  ON inventory_items (hospital_id, LOWER(sku))
  WHERE sku IS NOT NULL AND sku <> '';
