-- Lab technicians need write access to order tests and complete results.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.slug = 'lab_technician'
  AND p.slug IN ('patients:write')
ON CONFLICT DO NOTHING;

-- Pharmacists manage medical inventory (gated on patients:* in API).
-- No hospitals:* grant — Facility remains admin-only.
