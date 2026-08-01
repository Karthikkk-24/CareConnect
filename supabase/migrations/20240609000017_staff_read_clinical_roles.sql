-- Grant staff:read so clinicians/front desk can populate doctor pickers
-- without full staff-admin access.

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug = 'staff:read'
WHERE r.slug IN ('doctor', 'nurse', 'receptionist')
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
