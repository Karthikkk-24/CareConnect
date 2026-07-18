# CareConnect

Open-source hospital and healthcare management platform built with Next.js, NestJS, GraphQL, TypeORM, and Supabase PostgreSQL.

## Architecture

```
apps/web     → Next.js 16 frontend (claymorphism UI)
apps/api     → NestJS GraphQL API with TypeORM
packages/ui  → Shared claymorphism component library
packages/types → Shared TypeScript types and Zod schemas
supabase/    → Database migrations and config
legacy/      → Original Vite + React prototype
```

See [docs/architecture.md](docs/architecture.md) and [docs/api.md](docs/api.md) for details.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Supabase CLI (for local database)
- PostgreSQL (via Supabase local or cloud)

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
pnpm setup:env
```

Then edit the created files with your real Supabase credentials:

- **`apps/api/.env`** — `DATABASE_URL` (Postgres URI from Supabase → Settings → Database) and `SUPABASE_JWT_SECRET`
- **`apps/web/.env.local`** — `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The API validates env on startup and fails fast with a clear message if placeholders are still present.

### 3. Run database migrations

```bash
# With Supabase CLI linked to your project:
supabase db push

# Or apply migrations manually to your Postgres instance
```

### 4. Create Supabase Storage bucket (for patient documents)

In Supabase Dashboard → Storage, create a bucket named `patient-documents` (public or with RLS policies).

### 5. Build shared types (required before API dev)

```bash
pnpm --filter @careconnect/types build
```

### 6. Start development servers

```bash
# Start both frontend and API
pnpm dev

# Or individually:
pnpm dev:web   # http://localhost:3000
pnpm dev:api   # http://localhost:4000/graphql
```

## Testing & docs

```bash
pnpm --filter api test          # Jest unit tests
pnpm --filter web test:e2e      # Playwright smoke tests
pnpm --filter @careconnect/ui storybook
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and PR guidelines.

## Project Status

### Phase 0 — Foundation ✅
- Turborepo monorepo with pnpm workspaces
- Next.js app with claymorphism design system
- NestJS API with GraphQL + TypeORM
- Supabase schema migrations (RBAC tables)
- Supabase Auth ↔ NestJS JWT validation
- GitHub Actions CI pipeline

### Phase 1 — Core Platform ✅
- RBAC with roles, permissions, and guards
- Landing page (hero, features, pricing, CTA)
- Login, register, and onboarding flows
- Hospital admin dashboard with sidebar
- Staff CRUD (create, list, edit, deactivate)

### Phase 2 — Patient Management ✅
- Patient DB schema (demographics, insurance, allergies, medications, history, documents, consents)
- Single patient registration (5-step wizard)
- Patient 360° detail view
- Medical history timeline
- Bulk CSV import with dry-run validation
- Document upload metadata (requires Supabase Storage bucket)

### Phase 3 — Scheduling & Admissions ✅
- Appointments and scheduling
- Admissions and bed management
- Facility (wards, beds, departments)

### Phase 4 — Clinical & Discharge ✅
- Clinical notes, vitals, diagnoses, prescriptions, lab orders
- Discharge summaries and follow-ups
- Role-specific dashboards (doctor, nurse)

### Phase 5 — Operations & Portal ✅
- Billing, invoices, and payments
- Inventory and pharmacy
- Reports and analytics dashboard
- Patient portal (appointments, records, prescriptions, lab results)
- Staff invites and audit logging

### Phase 6 — Polish ✅
- Playwright E2E smoke tests
- Jest unit tests (auth, staff, patients, RBAC guard)
- API, architecture, and contributing docs
- Storybook for `@careconnect/ui`
- Accessibility improvements (login, patient wizard, dashboard nav)
- i18n scaffold (`next-intl`, English default)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, Tailwind CSS 4, Apollo Client, next-intl |
| Backend | NestJS 11, GraphQL (code-first), TypeORM |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth + JWT guards |
| Monorepo | Turborepo + pnpm |

## License

MIT
