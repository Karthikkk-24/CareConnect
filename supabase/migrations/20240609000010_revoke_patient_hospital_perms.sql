-- Revoke hospital-wide list permissions from the patient role.
-- Patients must use the portal GraphQL API (role-gated + patient-scoped),
-- not invoices/appointments hospital list queries.

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.slug = 'patient'
  AND p.slug IN ('appointments:read', 'billing:read');
