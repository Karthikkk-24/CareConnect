-- Seed roles and permissions

INSERT INTO roles (slug, name, description) VALUES
  ('super_admin', 'Super Admin', 'Platform-wide administrator'),
  ('hospital_admin', 'Hospital Admin', 'Full hospital management access'),
  ('hospital_manager', 'Hospital Manager', 'Operational hospital management'),
  ('doctor', 'Doctor', 'Clinical care provider'),
  ('nurse', 'Nurse', 'Nursing staff'),
  ('receptionist', 'Receptionist', 'Front desk operations'),
  ('lab_technician', 'Lab Technician', 'Laboratory operations'),
  ('pharmacist', 'Pharmacist', 'Pharmacy operations'),
  ('accountant', 'Accountant', 'Financial operations'),
  ('patient', 'Patient', 'Patient portal access');

INSERT INTO permissions (slug, name, description) VALUES
  ('hospitals:read', 'Read Hospitals', 'View hospital information'),
  ('hospitals:write', 'Write Hospitals', 'Create and update hospitals'),
  ('staff:read', 'Read Staff', 'View staff members'),
  ('staff:write', 'Write Staff', 'Create and update staff'),
  ('patients:read', 'Read Patients', 'View patient records'),
  ('patients:write', 'Write Patients', 'Create and update patients'),
  ('appointments:read', 'Read Appointments', 'View appointments'),
  ('appointments:write', 'Write Appointments', 'Manage appointments'),
  ('billing:read', 'Read Billing', 'View billing records'),
  ('billing:write', 'Write Billing', 'Manage billing'),
  ('reports:read', 'Read Reports', 'View reports and analytics'),
  ('roles:manage', 'Manage Roles', 'Assign roles and permissions');

-- Super admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.slug = 'super_admin';

-- Hospital admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'hospital_admin'
  AND p.slug IN (
    'hospitals:read', 'staff:read', 'staff:write',
    'patients:read', 'patients:write',
    'appointments:read', 'appointments:write',
    'billing:read', 'billing:write', 'reports:read', 'roles:manage'
  );

-- Hospital manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'hospital_manager'
  AND p.slug IN (
    'staff:read', 'patients:read', 'patients:write',
    'appointments:read', 'appointments:write', 'reports:read'
  );

-- Doctor permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'doctor'
  AND p.slug IN ('patients:read', 'patients:write', 'appointments:read', 'appointments:write');

-- Nurse permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'nurse'
  AND p.slug IN ('patients:read', 'patients:write', 'appointments:read');

-- Receptionist permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'receptionist'
  AND p.slug IN ('patients:read', 'patients:write', 'appointments:read', 'appointments:write');

-- Patient: no hospital-wide GraphQL permissions.
-- Portal access is enforced via @Roles('patient') on portal resolvers.
-- (intentionally no role_permissions rows for patient)
