-- One lab result per lab order at the database layer.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_results_one_per_order
  ON lab_results (lab_order_id);
