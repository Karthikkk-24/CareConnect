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

## Project layout

- `apps/web` — Next.js frontend (Clerk)
- `apps/api` — NestJS GraphQL API (Clerk JWKS + Neon)
- `packages/ui` — Shared UI components
- `packages/types` — Shared types and Zod schemas
- `supabase/migrations` — Neon-compatible SQL migrations
- `docs/` — Architecture and API documentation

See [docs/architecture.md](docs/architecture.md) and [docs/api.md](docs/api.md) for deeper context.
