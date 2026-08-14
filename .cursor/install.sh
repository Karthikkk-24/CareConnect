#!/usr/bin/env bash
# Idempotent setup for CareConnect. Runs after checkout (and at environment-build
# time). Must terminate and be safe to re-run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# System dependency: local PostgreSQL server (dev DB, replaces Neon). Idempotent.
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "install.sh: installing PostgreSQL..."
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
else
  echo "install.sh: PostgreSQL already installed"
fi

corepack enable >/dev/null 2>&1 || true

# Install workspace deps exactly as CI does (blocked build scripts are fine).
pnpm install --frozen-lockfile

# Shared types must be built before the API/web compile against them.
pnpm --filter @careconnect/types build

echo "install.sh: dependencies ready"
