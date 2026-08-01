-- Grant facility read to clinical/front-desk roles that admit patients
-- so wards/beds queries succeed without granting hospitals:write.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = 'hospitals:read'
WHERE r.slug IN ('hospital_manager', 'doctor', 'nurse', 'receptionist')
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
