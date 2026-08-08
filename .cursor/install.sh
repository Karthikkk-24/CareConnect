#!/usr/bin/env bash
# Idempotent dependency setup for CareConnect. Runs after checkout (and at
# environment-build time). Must terminate and be safe to re-run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

corepack enable >/dev/null 2>&1 || true

# Install workspace deps exactly as CI does (blocked build scripts are fine).
pnpm install --frozen-lockfile

# Shared types must be built before the API/web compile against them.
pnpm --filter @careconnect/types build

echo "install.sh: dependencies ready"
