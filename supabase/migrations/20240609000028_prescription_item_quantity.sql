-- Dispense must decrement by prescribed quantity, not 1 unit per Rx line (#245).
ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) NOT NULL DEFAULT 1;

ALTER TABLE prescription_items
  DROP CONSTRAINT IF EXISTS prescription_items_quantity_positive;

ALTER TABLE prescription_items
  ADD CONSTRAINT prescription_items_quantity_positive CHECK (quantity > 0);
