-- hospital_manager is allowed on staff write resolvers but lacked staff:write.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'hospital_manager'
  AND p.slug = 'staff:write'
ON CONFLICT DO NOTHING;
