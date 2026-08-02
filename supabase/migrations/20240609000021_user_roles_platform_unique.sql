-- Prevent duplicate platform-scoped roles (NULL hospital_id is distinct in
-- UNIQUE (user_id, role_id, hospital_id)).
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_platform_role
  ON user_roles (user_id, role_id)
  WHERE hospital_id IS NULL;
