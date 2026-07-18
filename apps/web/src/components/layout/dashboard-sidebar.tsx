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
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useClerk } from '@clerk/nextjs';
import { cn } from '@careconnect/ui';
import { ME_QUERY } from '@/lib/graphql/queries';

const baseNavKeys = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/staff', key: 'staff', icon: UserCog },
  { href: '/patients', key: 'patients', icon: Users },
  { href: '/appointments', key: 'appointments', icon: Calendar },
  { href: '/settings', key: 'settings', icon: Settings },
] as const;

const adminNavKeys = [
  { href: '/finance', key: 'finance', icon: DollarSign },
  { href: '/pharmacy', key: 'pharmacy', icon: Pill },
  { href: '/inventory', key: 'inventory', icon: Package },
  { href: '/reports', key: 'reports', icon: BarChart3 },
] as const;

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

  const navItems = isHospitalAdmin
    ? [...baseNavKeys.slice(0, 4), ...adminNavKeys, baseNavKeys[4]]
    : baseNavKeys;

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

      <nav className="flex flex-1 flex-col gap-1" aria-label={t('mainNav')}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const label = t(item.key);

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
          href="/settings"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-clay-text-muted hover:bg-clay-primary-light/50 hover:text-clay-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-primary"
        >
          <Building2 className="h-5 w-5" aria-hidden="true" />
          {t('hospitalProfile')}
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
