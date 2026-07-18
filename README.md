# CareConnect

Open-source hospital and healthcare management platform built with Next.js, NestJS, GraphQL, TypeORM, **Neon Postgres**, and **Clerk** authentication (email + Google).

## Architecture

```
apps/web     → Next.js 16 frontend (claymorphism UI) + Clerk
apps/api     → NestJS GraphQL API with TypeORM + Clerk JWT (JWKS)
packages/ui  → Shared claymorphism component library
packages/types → Shared TypeScript types and Zod schemas
supabase/migrations/ → SQL migrations (Neon-compatible; apply with psql)
legacy/      → Original Vite + React prototype
```

See [docs/architecture.md](docs/architecture.md) and [docs/api.md](docs/api.md) for details.

## Prerequisites

- Node.js 20+
- pnpm 10+
- A [Neon](https://neon.tech) Postgres project
- A [Clerk](https://clerk.com) application (enable Google under Social Connections)

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
pnpm setup:env
```

Copy placeholders from `.env.example` / `apps/api/.env.example` / `apps/web/.env.example` into **gitignored** local files only:

- **`apps/api/.env`** — `DATABASE_URL` (Neon connection string), `DATABASE_SSL=true`, `CLERK_SECRET_KEY`, `CLERK_ISSUER` (e.g. `https://your-app.clerk.accounts.dev`)
- **`apps/web/.env.local`** — `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`

Never commit real secrets. Rotate any credential that was pasted into chat or tickets.

### 3. Run database migrations

```bash
# Against Neon (example):
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20240609000001_initial_schema.sql
# …apply remaining files in order under supabase/migrations/
```

Or use the Neon SQL editor / MCP to run each migration file in order.

### 4. Patient documents

Uploads are stored on the API under `uploads/` (gitignored) and served at `/uploads/*`. No Supabase Storage required.

### 5. Build shared types (required before API dev)

```bash
pnpm --filter @careconnect/types build
```

### 6. Start development servers

```bash
pnpm dev
# web → http://localhost:3000
# api → http://localhost:4000/graphql
```

In Clerk Dashboard, allow `http://localhost:3000` as an origin/redirect URL and enable Google OAuth.

## Testing & docs

```bash
pnpm --filter api test
pnpm --filter web test:e2e
pnpm --filter @careconnect/ui storybook
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and PR guidelines.

## Project Status

### Phase 0 — Foundation ✅
- Turborepo monorepo with pnpm workspaces
- Next.js claymorphism UI + NestJS GraphQL + TypeORM
- Neon-ready SQL migrations + Clerk auth

### Phase 1 — Core Platform ✅
- RBAC, hospital onboarding, staff CRUD + invite links
- Login / register / forgot-password via Clerk (including Google)

### Phase 2 — Patient Management ✅
- Patient wizard, detail/edit, documents upload, CSV import, duplicates

### Phase 3 — Scheduling & Admissions ✅
- Appointments, admissions, facility (departments/wards/beds), occupancy

### Phase 4 — Clinical & Discharge ✅
- Vitals, notes, Rx, lab, discharge, follow-ups, role dashboards

### Phase 5 — Operations & Portal ✅
- Billing/payments, pharmacy, inventory, reports, patient portal

### Phase 6 — Polish ✅
- Playwright smoke tests, Jest unit tests, docs, Storybook, a11y + i18n scaffold

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, Tailwind CSS 4, Apollo Client, Clerk, next-intl |
| Backend | NestJS 11, GraphQL (code-first), TypeORM |
| Database | Neon PostgreSQL |
| Auth | Clerk (JWT via JWKS) |
| Monorepo | Turborepo + pnpm |

## License

MIT
