-- Least-privilege for pharmacy operations (#264):
-- pharmacist was granted patients:write (migration 009) only so pharmacy
-- resolvers' permission checks passed. Replace it with a dedicated
-- pharmacy:write slug and grant it to the roles allowed on the pharmacy
-- and inventory write mutations.

INSERT INTO permissions (slug, name, description)
VALUES (
  'pharmacy:write',
  'Write Pharmacy',
  'Manage pharmacy stock, dispense prescriptions, and manage inventory'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.slug = 'pharmacy:write'
  AND r.slug IN (
    'pharmacist',
    'hospital_admin',
    'hospital_manager',
    'super_admin'
  )
ON CONFLICT DO NOTHING;

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.slug = 'pharmacist'
  AND p.slug = 'patients:write';
