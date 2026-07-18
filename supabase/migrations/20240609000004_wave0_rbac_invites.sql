-- Wave 0: RBAC seed fixes + staff invites table

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'hospital_admin' AND p.slug = 'hospitals:write'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'lab_technician'
  AND p.slug IN ('patients:read', 'appointments:read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'pharmacist'
  AND p.slug IN ('patients:read', 'billing:read')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'accountant'
  AND p.slug IN ('billing:read', 'billing:write', 'reports:read')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS staff_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role_slug VARCHAR(50) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  staff_profile_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON staff_invites(token);
CREATE INDEX IF NOT EXISTS idx_staff_invites_hospital ON staff_invites(hospital_id);
