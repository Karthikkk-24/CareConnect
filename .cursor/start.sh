#!/usr/bin/env bash
# Per-boot startup for CareConnect: bring up the local Postgres dev database,
# apply migrations once, and write the app env files. Tolerates restarts and
# returns (the dev servers themselves run as `terminals`).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PG_VER=16
DB_NAME=careconnect
DB_USER=careconnect
DB_PASS=careconnect

# --- 1. Start the local PostgreSQL cluster (idempotent) ------------------------
sudo pg_ctlcluster "$PG_VER" main start 2>/dev/null || true
for _ in $(seq 1 30); do
  sudo -u postgres pg_isready -q && break
  sleep 1
done

# --- 2. Ensure role + database exist ------------------------------------------
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

# --- 3. Apply SQL migrations once (gated on the first table) -------------------
export PGPASSWORD="${DB_PASS}"
applied="$(psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" -tAc "SELECT to_regclass('public.hospitals')" 2>/dev/null || true)"
if [ -z "${applied}" ] || [ "${applied}" = "" ]; then
  echo "start.sh: applying database migrations..."
  for f in supabase/migrations/*.sql; do
    psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -f "$f" >/dev/null
  done
else
  echo "start.sh: migrations already applied, skipping"
fi

# --- 4. Write env files -------------------------------------------------------
# Real Clerk credentials, when added as Cloud Agent Secrets, are picked up here
# automatically; otherwise CI-style placeholders keep build/API/SSR working.
CLERK_PK="${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-pk_test_Y2ktcGxhY2Vob2xkZXIuY2xlcmsuYWNjb3VudHMuZGV2JA}"
CLERK_SK="${CLERK_SECRET_KEY:-sk_test_ci_placeholder_not_real}"
CLERK_ISS="${CLERK_ISSUER:-https://example.clerk.accounts.dev}"

cat > apps/api/.env <<EOF
API_PORT=4000
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
DATABASE_SSL=false
CLERK_SECRET_KEY=${CLERK_SK}
CLERK_ISSUER=${CLERK_ISS}
CLERK_AUTHORIZED_PARTIES=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
API_PUBLIC_URL=http://localhost:4000
EOF

cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${CLERK_PK}
CLERK_SECRET_KEY=${CLERK_SK}
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
EOF

echo "start.sh: PostgreSQL ready and env files written"
