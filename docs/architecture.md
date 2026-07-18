# CareConnect Architecture

CareConnect is a Turborepo monorepo for hospital and clinic operations.

## Stack overview

```
┌─────────────────┐     GraphQL      ┌─────────────────┐
│   apps/web      │ ◄──────────────► │   apps/api      │
│   Next.js 16    │   Apollo Client  │   NestJS 11     │
│   Tailwind 4    │                  │   GraphQL       │
└────────┬────────┘                  └────────┬────────┘
         │                                    │
         │ Supabase Auth                      │ TypeORM
         ▼                                    ▼
┌─────────────────────────────────────────────────────┐
│              Supabase PostgreSQL                     │
│   Auth · Storage · Migrations · RLS (where used)   │
└─────────────────────────────────────────────────────┘
```

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Apollo Client |
| Backend | NestJS 11, GraphQL (code-first), class-validator |
| ORM | TypeORM 0.3 (Postgres) |
| Auth | Supabase Auth (JWT) + NestJS guards |
| Shared UI | `@careconnect/ui` (claymorphism components) |
| Shared types | `@careconnect/types` (Zod + TS) |
| Monorepo | Turborepo, pnpm workspaces |

## Request flow

1. User signs in via Supabase Auth in the Next.js app.
2. Apollo Client sends GraphQL requests with the Supabase access token.
3. `GqlAuthGuard` validates JWT and loads/syncs the `User` entity.
4. `RolesGuard` enforces `@Roles` / `@Permissions` metadata.
5. Services enforce hospital tenancy (`hospitalId`) for multi-tenant data.
6. TypeORM reads/writes Postgres; audit events are logged where configured.

## Domain modules (API)

Core platform: auth, users, hospitals, staff, RBAC, audit.

Clinical & operations: patients, appointments, admissions, facility (wards/beds), clinical (notes, labs, prescriptions), discharge, follow-ups.

Business: billing, inventory, pharmacy, reports, dashboard.

Patient portal: dedicated resolvers for logged-in patients.

## Frontend structure

- `app/(auth)` — login, register, onboarding
- `app/(dashboard)` — staff/admin workflows
- `app/(portal)` — patient portal
- Marketing pages — docs, privacy, terms
- `@/components` — forms, layout, domain UI
- `@/lib/graphql` — queries and mutations

## Database

SQL migrations live in `supabase/migrations/`. TypeORM entities mirror tables; `synchronize: false` in production paths.

Patient records support soft delete. Duplicate detection (email, phone, ID number) is scoped per hospital.

## Testing & quality

- **API unit tests** — Jest with mocked repositories (`pnpm --filter api test`)
- **Web E2E** — Playwright smoke tests (`pnpm --filter web test:e2e`)
- **UI** — Storybook for `@careconnect/ui` components

## Deployment notes

- Web: build with `NEXT_PUBLIC_*` env vars for Supabase and API URL.
- API: requires `DATABASE_URL`, `SUPABASE_JWT_SECRET`, and optional Supabase service role for invites.
- Run migrations before deploying API changes that depend on new schema.
