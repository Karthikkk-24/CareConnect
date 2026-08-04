/**
 * Client-side route access rules (defense-in-depth; API still enforces).
 * Prefer permissions when available; fall back to roles for role-specific boards.
 */

export type AccessContext = {
  roles: string[];
  permissions: string[];
};

type RouteRule = {
  /** Path prefix matched with exact or `${prefix}/...` */
  prefix: string;
  anyPermissions?: string[];
  anyRoles?: string[];
};

/** Write/create/edit routes — checked before read rules (longest prefix first) */
const WRITE_ROUTE_RULES: RouteRule[] = [
  { prefix: '/finance/invoices/new', anyPermissions: ['billing:write'] },
  { prefix: '/appointments/new', anyPermissions: ['appointments:write'] },
  { prefix: '/patients/import', anyPermissions: ['patients:write'] },
  { prefix: '/patients/new', anyPermissions: ['patients:write'] },
  { prefix: '/staff/new', anyPermissions: ['staff:write'] },
];

const WRITE_ROUTE_PATTERNS: {
  pattern: RegExp;
  anyPermissions?: string[];
  anyRoles?: string[];
  /** When both are set, require permission AND role (e.g. discharge). */
  requireAll?: boolean;
}[] = [
  { pattern: /^\/patients\/[^/]+\/edit$/, anyPermissions: ['patients:write'] },
  {
    pattern: /^\/patients\/[^/]+\/discharge$/,
    anyPermissions: ['patients:write'],
    anyRoles: ['doctor', 'nurse', 'hospital_admin', 'hospital_manager'],
    requireAll: true,
  },
  { pattern: /^\/staff\/[^/]+\/edit$/, anyPermissions: ['staff:write'] },
];

const ROUTE_RULES: RouteRule[] = [
  { prefix: '/staff', anyPermissions: ['staff:read'] },
  { prefix: '/patients', anyPermissions: ['patients:read'] },
  { prefix: '/appointments', anyPermissions: ['appointments:read'] },
  { prefix: '/admissions', anyPermissions: ['patients:read'] },
  { prefix: '/wards', anyPermissions: ['hospitals:read', 'patients:read'] },
  { prefix: '/follow-ups', anyPermissions: ['patients:read'] },
  { prefix: '/finance', anyPermissions: ['billing:read'] },
  {
    prefix: '/pharmacy',
    anyRoles: ['pharmacist', 'hospital_admin', 'hospital_manager', 'super_admin'],
  },
  {
    prefix: '/inventory',
    anyRoles: ['pharmacist', 'hospital_admin', 'hospital_manager', 'super_admin'],
  },
  { prefix: '/reports', anyPermissions: ['reports:read'] },
  { prefix: '/dashboard/hospital', anyPermissions: ['reports:read'] },
  {
    prefix: '/doctor',
    anyRoles: ['doctor', 'hospital_admin', 'hospital_manager', 'super_admin'],
  },
  {
    prefix: '/nurse',
    anyRoles: ['nurse', 'hospital_admin', 'hospital_manager', 'super_admin'],
  },
  {
    prefix: '/lab',
    anyRoles: ['lab_technician', 'hospital_admin', 'hospital_manager', 'super_admin'],
    anyPermissions: ['lab:write'],
  },
  {
    prefix: '/settings',
    anyRoles: ['hospital_admin', 'super_admin'],
    anyPermissions: ['hospitals:write'],
  },
];

/** Longest prefix first so /dashboard/hospital wins over /dashboard */
const SORTED_RULES = [...ROUTE_RULES].sort(
  (a, b) => b.prefix.length - a.prefix.length,
);

const SORTED_WRITE_RULES = [...WRITE_ROUTE_RULES].sort(
  (a, b) => b.prefix.length - a.prefix.length,
);

function hasWriteAccess(
  rule: {
    anyPermissions?: string[];
    anyRoles?: string[];
    requireAll?: boolean;
  },
  ctx: AccessContext,
): boolean {
  if (ctx.roles.includes('super_admin')) return true;
  const hasPerm = rule.anyPermissions
    ? rule.anyPermissions.some((perm) => ctx.permissions.includes(perm))
    : false;
  const hasRole = rule.anyRoles
    ? rule.anyRoles.some((role) => ctx.roles.includes(role))
    : false;
  if (rule.requireAll && rule.anyPermissions && rule.anyRoles) {
    return hasPerm && hasRole;
  }
  return hasPerm || hasRole;
}

function matchesWriteRoute(pathname: string, ctx: AccessContext): boolean | null {
  for (const rule of WRITE_ROUTE_PATTERNS) {
    if (rule.pattern.test(pathname)) {
      return hasWriteAccess(rule, ctx);
    }
  }

  const writeRule = SORTED_WRITE_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (!writeRule?.anyPermissions) return null;
  return hasWriteAccess(writeRule, ctx);
}

/** Routes any authenticated non-patient staff may open without a specific rule */
const STAFF_PUBLIC_ROUTES = ['/dashboard'];

export function canAccessRoute(pathname: string, ctx: AccessContext): boolean {
  if (ctx.roles.includes('super_admin')) return true;
  if (ctx.roles.includes('patient')) return false;

  const writeAccess = matchesWriteRoute(pathname, ctx);
  if (writeAccess !== null) return writeAccess;

  if (STAFF_PUBLIC_ROUTES.some((route) => pathname === route)) return true;

  const rule = SORTED_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (!rule) return false;

  if (rule.anyRoles?.some((role) => ctx.roles.includes(role))) return true;
  if (rule.anyPermissions?.some((perm) => ctx.permissions.includes(perm))) {
    return true;
  }
  return false;
}

/** Whether a nav href should be shown for this user */
export function canSeeNavHref(href: string, ctx: AccessContext): boolean {
  return canAccessRoute(href, ctx);
}
