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
| `staff` | Staff CRUD, invite URLs, RBAC assignment |
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

Open Apollo Sandbox / Playground at `http://localhost:4000/graphql` while the API is running.
