-- Phase 5: Billing & Operations

CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'void');

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  method VARCHAR(50) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT 'each',
  reorder_level NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pharmacy_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  drug_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT 'each',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hospital_id, drug_name)
);

CREATE INDEX idx_invoices_hospital ON invoices(hospital_id);
CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_hospital ON payments(hospital_id);
CREATE INDEX idx_inventory_items_hospital ON inventory_items(hospital_id);
CREATE INDEX idx_pharmacy_stock_hospital ON pharmacy_stock(hospital_id);

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pharmacy_stock_updated_at BEFORE UPDATE ON pharmacy_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- AuthZ enforced in NestJS (no Supabase RLS)
