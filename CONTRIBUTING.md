# Contributing to CareConnect

Thank you for contributing to CareConnect. This guide covers local setup and the basics for opening a pull request.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Supabase CLI (recommended) or direct Postgres access

## Setup

```bash
git clone https://github.com/your-org/CareConnect.git
cd CareConnect
pnpm install
pnpm setup:env
```

Edit environment files with your Supabase credentials:

- `apps/api/.env`
- `apps/web/.env.local`

Build shared types (required before API dev):

```bash
pnpm --filter @careconnect/types build
```

Apply database migrations:

```bash
supabase db push
```

## Development

```bash
# Both apps
pnpm dev

# Individually
pnpm dev:web   # http://localhost:3000
pnpm dev:api   # http://localhost:4000/graphql
```

## Build & test

```bash
pnpm --filter api build
pnpm --filter web build
pnpm --filter api test
pnpm --filter web test:e2e
pnpm --filter @careconnect/ui storybook
```

For Playwright against an already-running dev server:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=true pnpm --filter web test:e2e
```

## Pull requests

1. Create a feature branch from `develop` or `main`.
2. Keep changes focused; match existing code style.
3. Run lint and build for affected packages.
4. Add or update tests when changing behavior.
5. Open a PR with a clear summary and test plan.

Do not commit secrets (`.env`, keys, credentials).

## Project layout

- `apps/web` — Next.js frontend
- `apps/api` — NestJS GraphQL API
- `packages/ui` — Shared UI components
- `packages/types` — Shared types and Zod schemas
- `supabase/migrations` — SQL migrations
- `docs/` — Architecture and API documentation

See [docs/architecture.md](docs/architecture.md) and [docs/api.md](docs/api.md) for deeper context.
