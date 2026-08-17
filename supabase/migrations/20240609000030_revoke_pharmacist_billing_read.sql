-- Least-privilege (#282): pharmacists do not need hospital-wide invoice access.
-- Seed 002 did not grant pharmacist billing:read; wave0 (004) added it so they
-- could pass BillingResolver's STAFF_ROLES + billing:read gate. Finance PHI
-- (invoices, nested patient identity) is not part of dispense/stock work.
-- After this revoke, Permissions(BILLING_READ) fails for pharmacist.

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.slug = 'pharmacist'
  AND p.slug = 'billing:read';
