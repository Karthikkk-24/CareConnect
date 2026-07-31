-- At most one hospital_admin per hospital (bootstrap + invite policy).
-- Role id is resolved at migration time because index predicates must be immutable.

DO $$
DECLARE
  admin_role_id UUID;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE slug = 'hospital_admin';
  IF admin_role_id IS NOT NULL THEN
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_one_hospital_admin
       ON user_roles (hospital_id)
       WHERE role_id = %L AND hospital_id IS NOT NULL',
      admin_role_id
    );
  END IF;
END $$;
