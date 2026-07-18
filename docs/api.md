# CareConnect GraphQL API

The NestJS API exposes a code-first GraphQL schema at `/graphql` (default: `http://localhost:4000/graphql`).

## Authentication

All protected operations require a Supabase JWT in the `Authorization` header:

```http
Authorization: Bearer <supabase_access_token>
```

The API validates the token against `SUPABASE_JWT_SECRET`, syncs the user record, and attaches `req.user` for guards.

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
| `auth` / `users` | JWT validation, `me`, onboarding |
| `hospitals` | Hospital profile and settings |
| `staff` | Staff CRUD, invites, RBAC assignment |
| `patients` | Patient CRUD, bulk import, documents, soft delete |
| `appointments` | Scheduling and status updates |
| `admissions` | Admissions and bed occupancy |
| `clinical` | Notes, vitals, diagnoses, prescriptions, lab orders |
| `discharge` | Discharge summaries and follow-ups |
| `billing` | Invoices and payments |
| `facility` | Wards, beds, departments |
| `inventory` / `pharmacy` | Stock and dispensing |
| `dashboard` / `reports` | Aggregates and reporting |
| `portal` | Patient-facing portal queries |
| `audit` | Audit log writes (internal) |

## Example queries

```graphql
query Me {
  me {
    id
    email
    fullName
    hospitalId
    roles
    permissions
    onboardingCompleted
  }
}
```

```graphql
query Patients($hospitalId: ID!, $page: Int, $search: String) {
  patients(hospitalId: $hospitalId, page: $page, search: $search) {
    items {
      id
      fullName
      email
      phone
      status
    }
    total
  }
}
```

## Playground

When `NODE_ENV=development`, GraphQL Playground is enabled at the same `/graphql` endpoint. Use it to explore the auto-generated schema in `apps/api/src/schema.gql` after the server starts.

## Environment

See `apps/api/.env.example` for required variables:

- `DATABASE_URL` — Postgres connection string (Supabase)
- `SUPABASE_JWT_SECRET` — JWT verification secret
- Optional: Supabase service role for staff invites
