# CareConnect GraphQL API

The NestJS API exposes a code-first GraphQL schema at `/graphql` (default: `http://localhost:4000/graphql`).

## Authentication

All protected operations require a **Clerk** session JWT in the `Authorization` header:

```http
Authorization: Bearer <clerk_session_token>
```

The API validates the token via Clerk JWKS (`CLERK_ISSUER/.well-known/jwks.json`), syncs the user record (`users.auth_id` = Clerk `sub`), and attaches `req.user` for guards.

Inactive accounts receive `401 Unauthorized` with message `Account is deactivated`.

## Authorization

Resolvers use `GqlAuthGuard` plus `RolesGuard`:

- **Roles** — `@Roles('hospital_admin', 'doctor', …)`
- **Permissions** — `@Permissions('patients:read', …)`
- **super_admin** bypasses role and permission checks

Hospital-scoped data is filtered by the authenticated user's `hospitalId` unless the caller is `super_admin`.

## Main modules

| Module | Purpose |
|--------|---------|
| `auth` / `users` | JWT validation, `me`, onboarding / patient onboarding |
| `hospitals` | Hospital profile and settings |
| `staff` | Staff CRUD, invite URLs, RBAC assignment. `hospital_admin` invite is a pending successor; the unique role transfers on accept. |
| `patients` | Patient CRUD, bulk import, documents, soft delete, account linking |
| `appointments` | Scheduling and status updates |
| `admissions` | Admissions and bed occupancy |
| `clinical` | Notes, vitals, diagnoses, prescriptions, lab orders |
| `discharge` | Discharge summaries and follow-ups |
| `billing` | Invoices and payments |
| `facility` | Wards, beds, departments |
| `portal` | Patient portal read APIs |
| `pharmacy` / `inventory` / `reports` | Ops modules |
| `uploads` | Authenticated `POST /uploads/patient-documents` |

## Local docs

When `NODE_ENV` is not `production`, open Apollo Sandbox / Playground at `http://localhost:4000/graphql` while the API is running. In production the GraphQL Playground and schema introspection are disabled.

## Database TLS policy

- Set `DATABASE_SSL=true` to enable TLS for the Postgres connection (recommended for hosted providers such as Neon).
- Outside production (`NODE_ENV != production`), `DATABASE_SSL=true` connects with `rejectUnauthorized: false` because local/dev environments usually lack the provider CA certificates. Do not expose such an instance publicly.
- In production (`NODE_ENV=production`), `DATABASE_SSL=true` uses pg's default TLS settings — the server certificate chain is fully verified against the system CA store. For providers whose CA is not in the system store, set `PGSSLROOTCERT` (and related `PGSSL*` env vars) to the CA bundle instead of relaxing verification.
- When `DATABASE_SSL` is unset or `false`, the connection is plaintext — only suitable for local databases.
