-- Enforce one canonical app user per email (case-insensitive).
-- Keep the earliest row per LOWER(email); null out conflicting FKs on losers
-- only where safe — duplicate emails should be rare after prior auth fixes.

-- Prefer the row that already has a real (non-pending) Clerk auth_id, else oldest.
WITH ranked AS (
  SELECT
    id,
    LOWER(email) AS email_key,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(email)
      ORDER BY
        CASE WHEN auth_id LIKE 'pending_%' THEN 1 ELSE 0 END ASC,
        created_at ASC,
        id ASC
    ) AS rn
  FROM users
  WHERE deleted_at IS NULL
),
dupes AS (
  SELECT id FROM ranked WHERE rn > 1
)
UPDATE users u
SET
  email = u.email || '+dup-' || LEFT(u.id::text, 8),
  updated_at = NOW()
FROM dupes d
WHERE u.id = d.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
  ON users (LOWER(email))
  WHERE deleted_at IS NULL;
