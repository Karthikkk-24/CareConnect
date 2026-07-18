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
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useClerk } from '@clerk/nextjs';
import { cn } from '@careconnect/ui';
import { ME_QUERY } from '@/lib/graphql/queries';

type NavItem = { href: string; key: string; icon: typeof LayoutDashboard };

const baseNav: NavItem[] = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/staff', key: 'staff', icon: UserCog },
  { href: '/patients', key: 'patients', icon: Users },
  { href: '/appointments', key: 'appointments', icon: Calendar },
  { href: '/admissions', key: 'admissions', icon: BedDouble },
  { href: '/follow-ups', key: 'followUps', icon: CalendarCheck },
  { href: '/settings', key: 'settings', icon: Settings },
];

const clinicalNav: NavItem[] = [
  { href: '/doctor', key: 'doctor', icon: Stethoscope },
  { href: '/nurse', key: 'nurse', icon: HeartPulse },
  { href: '/lab', key: 'lab', icon: FlaskConical },
];

const adminNav: NavItem[] = [
  { href: '/finance', key: 'finance', icon: DollarSign },
  { href: '/pharmacy', key: 'pharmacy', icon: Pill },
  { href: '/inventory', key: 'inventory', icon: Package },
  { href: '/reports', key: 'reports', icon: BarChart3 },
];

export function DashboardSidebar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const clerk = useClerk();
  const { data: meData } = useQuery(ME_QUERY);

  const roles: string[] = meData?.me?.roles ?? [];
  const isHospitalAdmin =
    roles.includes('hospital_admin') ||
    roles.includes('hospital_manager') ||
    roles.includes('super_admin');
  const isDoctor = roles.includes('doctor');
  const isNurse = roles.includes('nurse');
  const isLab = roles.includes('lab_technician');
  const isPharmacist = roles.includes('pharmacist');
  const isAccountant = roles.includes('accountant');

  const navItems: NavItem[] = [...baseNav];
  if (isDoctor) navItems.splice(5, 0, clinicalNav[0]);
  if (isNurse) navItems.splice(5, 0, clinicalNav[1]);
  if (isLab || isHospitalAdmin) navItems.splice(5, 0, clinicalNav[2]);
  if (isHospitalAdmin || isAccountant) {
    navItems.splice(navItems.length - 1, 0, ...adminNav.filter((n) => n.key === 'finance' || n.key === 'reports'));
  }
  if (isHospitalAdmin || isPharmacist) {
    navItems.splice(navItems.length - 1, 0, ...adminNav.filter((n) => n.key === 'pharmacy' || n.key === 'inventory'));
  }
  if (isHospitalAdmin) {
    for (const item of adminNav) {
      if (!navItems.some((n) => n.href === item.href)) {
        navItems.splice(navItems.length - 1, 0, item);
      }
    }
  }

  // Deduplicate by href
  const seen = new Set<string>();
  const uniqueNav = navItems.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });

  const handleLogout = async () => {
    await clerk.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className="flex h-full w-64 flex-col rounded-3xl bg-clay-surface p-4 shadow-clay"
      aria-label={t('mainNav')}
    >
      <div className="mb-8 flex items-center gap-2 px-2">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-primary-light to-clay-primary text-sm font-bold text-white shadow-clay-sm"
          aria-hidden="true"
        >
          CC
        </div>
        <div>
          <p className="font-bold text-clay-text">CareConnect</p>
          <p className="text-xs text-clay-text-muted">{t('brandSubtitle')}</p>
        </div>
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
        <Link
          href="/settings/facility"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-clay-text-muted hover:bg-clay-primary-light/50 hover:text-clay-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-primary"
        >
          <Building2 className="h-5 w-5" aria-hidden="true" />
          Facility
        </Link>
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
    </aside>
  );
}
