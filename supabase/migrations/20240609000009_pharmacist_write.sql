-- Pharmacists need write access to dispense prescriptions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'pharmacist'
  AND p.slug IN ('patients:write')
ON CONFLICT DO NOTHING;
