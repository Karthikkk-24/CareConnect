#!/usr/bin/env bash
# Per-boot startup for CareConnect: bring up the local Postgres dev database,
# apply any pending migrations, and write the app env files. Tolerates restarts
# and returns (the dev servers themselves run as `terminals`).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DB_NAME=careconnect
DB_USER=careconnect
DB_PASS=careconnect

# --- 1. Start the local PostgreSQL cluster (idempotent) ------------------------
# Detect the installed cluster rather than hardcoding a version: install.sh pulls
# the distro-default `postgresql` metapackage, whose major version differs across
# Ubuntu releases, so a fixed version would silently fail to start on some images.
read -r PG_VER PG_CLUSTER < <(pg_lsclusters -h 2>/dev/null | awk 'NR==1 {print $1, $2}')
PG_VER="${PG_VER:-16}"
PG_CLUSTER="${PG_CLUSTER:-main}"

sudo pg_ctlcluster "$PG_VER" "$PG_CLUSTER" start 2>/dev/null || true
ready=""
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then ready=1; break; fi
  sleep 1
done
if [ -z "$ready" ]; then
  echo "start.sh: PostgreSQL cluster ${PG_VER}/${PG_CLUSTER} failed to become ready" >&2
  exit 1
fi

# --- 2. Ensure role + database exist ------------------------------------------
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

# --- 3. Apply SQL migrations (tracked per-file so partial failures re-run) -----
export PGPASSWORD="${DB_PASS}"
PSQL=(psql -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -tAX)

# Ledger of applied files. Gating on a single table (e.g. public.hospitals) would
# skip every remaining migration whenever an earlier file succeeded but a later
# one failed, leaving the schema permanently out of sync with the repo.
"${PSQL[@]}" -c "CREATE TABLE IF NOT EXISTS public._migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());" >/dev/null

for f in supabase/migrations/*.sql; do
  base="$(basename "$f")"
  if [ "$("${PSQL[@]}" -c "SELECT 1 FROM public._migrations WHERE filename = '${base}'")" = "1" ]; then
    continue
  fi
  echo "start.sh: applying migration ${base}..."
  # File + its ledger row commit in one transaction (every migration is
  # transaction-safe — no CONCURRENTLY/VACUUM), so any failure rolls the whole
  # thing back and the file re-runs cleanly on the next boot.
  "${PSQL[@]}" --single-transaction >/dev/null <<SQL
\i ${f}
INSERT INTO public._migrations (filename) VALUES ('${base}');
SQL
done
echo "start.sh: migrations up to date"

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
# The API (:4000) and web (:3000) dev servers run as `terminals` (see environment.json).
