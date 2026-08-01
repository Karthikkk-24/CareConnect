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

export function canAccessRoute(pathname: string, ctx: AccessContext): boolean {
  if (ctx.roles.includes('super_admin')) return true;
  if (ctx.roles.includes('patient')) return false;

  const rule = SORTED_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (!rule) return true;

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
