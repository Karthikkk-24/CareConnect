# CareConnect Architecture

CareConnect is a Turborepo monorepo for hospital and clinic operations.

## Stack overview

```
┌─────────────────┐     GraphQL      ┌─────────────────┐
│   apps/web      │ ◄──────────────► │   apps/api      │
│   Next.js 16    │   Apollo Client  │   NestJS 11     │
│   Clerk Auth    │   Bearer JWT     │   GraphQL       │
└────────┬────────┘                  └────────┬────────┘
         │                                    │
         │ Clerk session                      │ TypeORM + SSL
         ▼                                    ▼
┌──────────────┐                    ┌─────────────────┐
│    Clerk     │                    │  Neon Postgres  │
│  Google OAuth│                    │  app schema     │
└──────────────┘                    └─────────────────┘
```

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Apollo Client, Clerk |
| Backend | NestJS 11, GraphQL (code-first), class-validator |
| ORM | TypeORM 0.3 (Postgres) |
| Auth | Clerk (RS256 JWT via JWKS) + NestJS guards |
| Database | Neon PostgreSQL |
| Files | API local `uploads/` (authenticated POST) |
| Shared UI | `@careconnect/ui` (claymorphism components) |
| Shared types | `@careconnect/types` (Zod + TS) |
| Monorepo | Turborepo, pnpm workspaces |

## Request flow

1. User signs in via Clerk (email/password or Google) in the Next.js app.
2. Apollo Client attaches a Clerk session JWT as `Authorization: Bearer`.
3. `GqlAuthGuard` / `ClerkJwtStrategy` validates the JWT via Clerk JWKS and syncs the `User` row (`auth_id` = Clerk `user_…`).
4. `RolesGuard` enforces `@Roles` / `@Permissions` metadata.
5. Services enforce hospital tenancy (`hospitalId`) for multi-tenant data.
6. TypeORM reads/writes Neon; audit events are logged where configured.

## AuthZ model

Authorization is enforced in Nest (not Postgres RLS). Migrations are Neon-compatible and do not depend on Supabase `auth.uid()`.

## Modules

Hospitals, users/RBAC, staff (+ invites), patients, facility, appointments, admissions, clinical, discharge/follow-ups, portal, billing, pharmacy, inventory, reports, uploads.
