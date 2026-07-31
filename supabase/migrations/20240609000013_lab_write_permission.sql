-- Lab-scoped write permission so lab technicians can complete results
-- without gaining patients:write (demographics / unrelated patient mutations).

INSERT INTO permissions (slug, name, description)
VALUES (
  'lab:write',
  'Write Lab Results',
  'Enter and complete laboratory results'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.slug = 'lab:write'
  AND r.slug IN (
    'lab_technician',
    'doctor',
    'nurse',
    'hospital_admin',
    'hospital_manager',
    'super_admin'
  )
ON CONFLICT DO NOTHING;
