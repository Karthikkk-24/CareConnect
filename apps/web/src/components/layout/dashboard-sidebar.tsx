'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Calendar,
  Settings,
  LogOut,
  Building2,
  DollarSign,
  Pill,
  Package,
  BarChart3,
  BedDouble,
  Stethoscope,
  HeartPulse,
  FlaskConical,
  CalendarCheck,
  Menu,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useClerk } from '@clerk/nextjs';
import { useState } from 'react';
import { cn } from '@careconnect/ui';
import { ME_QUERY } from '@/lib/graphql/queries';
import {
  hasAnyRole,
  hasPermission,
  PERMISSIONS,
} from '@/lib/permissions';

type NavItem = {
  href: string;
  key: string;
  icon: typeof LayoutDashboard;
  visible: (ctx: NavContext) => boolean;
};

type NavContext = {
  roles: string[];
  permissions: string[];
};

const navCatalog: NavItem[] = [
  {
    href: '/dashboard',
    key: 'dashboard',
    icon: LayoutDashboard,
    visible: () => true,
  },
  {
    href: '/receptionist',
    key: 'receptionist',
    icon: CalendarCheck,
    visible: ({ roles }) => hasAnyRole(roles, 'receptionist'),
  },
  {
    href: '/doctor',
    key: 'doctor',
    icon: Stethoscope,
    visible: ({ roles }) => hasAnyRole(roles, 'doctor'),
  },
  {
    href: '/nurse',
    key: 'nurse',
    icon: HeartPulse,
    visible: ({ roles }) => hasAnyRole(roles, 'nurse'),
  },
  {
    href: '/lab',
    key: 'lab',
    icon: FlaskConical,
    visible: ({ roles }) =>
      hasAnyRole(roles, [
        'lab_technician',
        'hospital_admin',
        'hospital_manager',
        'super_admin',
      ]),
  },
  {
    href: '/staff',
    key: 'staff',
    icon: UserCog,
    visible: ({ permissions }) => hasPermission(permissions, PERMISSIONS.STAFF_READ),
  },
  {
    href: '/patients',
    key: 'patients',
    icon: Users,
    visible: ({ permissions }) => hasPermission(permissions, PERMISSIONS.PATIENTS_READ),
  },
  {
    href: '/appointments',
    key: 'appointments',
    icon: Calendar,
    visible: ({ permissions }) => hasPermission(permissions, PERMISSIONS.APPOINTMENTS_READ),
  },
  {
    href: '/admissions',
    key: 'admissions',
    icon: BedDouble,
    visible: ({ permissions }) => hasPermission(permissions, PERMISSIONS.PATIENTS_READ),
  },
  {
    href: '/follow-ups',
    key: 'followUps',
    icon: CalendarCheck,
    visible: ({ permissions }) => hasPermission(permissions, PERMISSIONS.APPOINTMENTS_READ),
  },
  {
    href: '/finance',
    key: 'finance',
    icon: DollarSign,
    visible: ({ permissions }) => hasPermission(permissions, PERMISSIONS.BILLING_READ),
  },
  {
    href: '/pharmacy',
    key: 'pharmacy',
    icon: Pill,
    visible: ({ roles }) =>
      hasAnyRole(roles, [
        'pharmacist',
        'hospital_admin',
        'hospital_manager',
        'super_admin',
      ]),
  },
  {
    href: '/inventory',
    key: 'inventory',
    icon: Package,
    visible: ({ roles, permissions }) =>
      hasAnyRole(roles, [
        'pharmacist',
        'hospital_admin',
        'hospital_manager',
        'super_admin',
      ]) && hasPermission(permissions, PERMISSIONS.PATIENTS_READ),
  },
  {
    href: '/reports',
    key: 'reports',
    icon: BarChart3,
    visible: ({ permissions }) => hasPermission(permissions, PERMISSIONS.REPORTS_READ),
  },
  {
    href: '/settings',
    key: 'settings',
    icon: Settings,
    visible: () => true,
  },
];

export function DashboardSidebar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const clerk = useClerk();
  const { data: meData } = useQuery(ME_QUERY);
  const [mobileOpen, setMobileOpen] = useState(false);

  const roles: string[] = meData?.me?.roles ?? [];
  const permissions: string[] = meData?.me?.permissions ?? [];
  const ctx: NavContext = { roles, permissions };

  const isHospitalAdmin = hasAnyRole(roles, [
    'hospital_admin',
    'hospital_manager',
    'super_admin',
  ]);
  const isDoctor = hasAnyRole(roles, 'doctor');
  const isNurse = hasAnyRole(roles, 'nurse');
  const isReceptionist = hasAnyRole(roles, 'receptionist');

  const uniqueNav = navCatalog.filter((item) => item.visible(ctx));

  const brandSubtitle = isHospitalAdmin
    ? t('brandSubtitleAdmin')
    : isDoctor
      ? t('brandSubtitleDoctor')
      : isNurse
        ? t('brandSubtitleNurse')
        : isReceptionist
          ? t.has('brandSubtitleReceptionist')
            ? t('brandSubtitleReceptionist')
            : 'Front desk'
          : t('brandSubtitle');

  const handleLogout = async () => {
    await clerk.signOut();
    router.push('/login');
    router.refresh();
  };

  const showFacility = hasPermission(permissions, PERMISSIONS.HOSPITALS_READ);

  const navContent = (
    <>
      <div className="mb-8 flex items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-primary-light to-clay-primary text-sm font-bold text-white shadow-clay-sm"
            aria-hidden="true"
          >
            CC
          </div>
          <div>
            <p className="font-bold text-clay-text">CareConnect</p>
            <p className="text-xs text-clay-text-muted">{brandSubtitle}</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-xl p-2 text-clay-text-muted lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label={t('mainNav')}>
        {uniqueNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const label = t.has(item.key) ? t(item.key) : item.key;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-primary',
                isActive
                  ? 'bg-clay-primary-light text-clay-primary shadow-clay-inset'
                  : 'text-clay-text-muted hover:bg-clay-primary-light/50 hover:text-clay-primary',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/40 pt-4">
        {showFacility ? (
          <Link
            href="/settings/facility"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-clay-text-muted hover:bg-clay-primary-light/50 hover:text-clay-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-primary"
          >
            <Building2 className="h-5 w-5" aria-hidden="true" />
            {t('facility')}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          aria-label={t('signOut')}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-clay-error hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-error"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          {t('signOut')}
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-2xl bg-clay-surface shadow-clay lg:hidden"
        aria-label="Open menu"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5 text-clay-text" />
      </button>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          role="presentation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'z-50 flex h-full w-64 flex-col rounded-3xl bg-clay-surface p-4 shadow-clay',
          'fixed inset-y-4 left-4 lg:static lg:inset-auto',
          mobileOpen ? 'flex' : 'hidden lg:flex',
        )}
        aria-label={t('mainNav')}
      >
        {navContent}
      </aside>
    </>
  );
}
