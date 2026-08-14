# Contributing to CareConnect

Thank you for contributing to CareConnect. This guide covers local setup and the basics for opening a pull request.

## Prerequisites

- Node.js 20+
- pnpm 10+
- A [Neon](https://neon.tech) Postgres database
- A [Clerk](https://clerk.com) application (enable Google OAuth for social login)

## Setup

```bash
git clone https://github.com/Karthikkk-24/CareConnect.git
cd CareConnect
pnpm install
pnpm setup:env
```

Edit environment files with your Neon + Clerk credentials (never commit real secrets):

- `apps/api/.env` — `DATABASE_URL`, `DATABASE_SSL=true`, `CLERK_SECRET_KEY`, `CLERK_ISSUER`
- `apps/web/.env.local` — `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`

Build shared types (required before API dev):

```bash
pnpm --filter @careconnect/types build
```

Apply database migrations (in order) with `psql` or the Neon SQL editor:

```bash
export DATABASE_URL="postgresql://..."
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

## Development

```bash
pnpm dev
# web → http://localhost:3000
# api → http://localhost:4000/graphql
```

In Clerk Dashboard, allow `http://localhost:3000` as an origin/redirect URL.

## Build & test

```bash
pnpm --filter api build
pnpm --filter web build
pnpm --filter api test
pnpm --filter web test:e2e
pnpm --filter @careconnect/ui storybook
```

## Pull requests

1. Create a feature branch from `develop` or `main`.
2. Keep changes focused; match existing code style.
3. Run lint and build for affected packages.
4. Add or update tests when changing behavior.
5. Open a PR with a clear summary and test plan.

Do not commit secrets (`.env`, keys, credentials).

## Security scanning (Snyk)

Dependency scanning:

```bash
snyk test --all-projects
```

### Enabling Snyk Code (SAST)

Snyk Code cannot be turned on from application code or CI alone. For org
**`kkshettigar24`**, an organization admin must enable it in the Snyk UI:

1. Sign in at [https://app.snyk.io](https://app.snyk.io) as an org admin for `kkshettigar24`.
2. Open **Settings → Snyk Code** (or Organization settings → Snyk Code).
3. Enable **Snyk Code** / code analysis for the organization.
4. Confirm billing/plan allows Snyk Code if prompted.

Until that is done, `snyk code test` returns **SNYK-CODE-0005** / 403 and OWASP/AI
code analysis stays unavailable. This cannot be fixed in application code or CI.

**Status (rescan 2026-08-08, `main` @ `0f3840d`):** `snyk test --all-projects` is
clean. `snyk code test --all-projects` is still **SNYK-CODE-0005** / 403 for org
`kkshettigar24`. Tracked in GitHub issue #246; leave that issue open until an
org admin enables Snyk Code. After enablement, re-run:

```bash
snyk code test --all-projects
```

File any new code findings as GitHub issues with severity P0–P4.

## Project layout

- `apps/web` — Next.js frontend (Clerk)
- `apps/api` — NestJS GraphQL API (Clerk JWKS + Neon)
- `packages/ui` — Shared UI components
- `packages/types` — Shared types and Zod schemas
- `supabase/migrations` — Neon-compatible SQL migrations
- `docs/` — Architecture and API documentation

See [docs/architecture.md](docs/architecture.md) and [docs/api.md](docs/api.md) for deeper context.
