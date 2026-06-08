'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Calendar,
  Settings,
  LogOut,
  Building2,
} from 'lucide-react';
import { cn } from '@careconnect/ui';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/staff', label: 'Staff', icon: UserCog },
  { href: '/patients', label: 'Patients', icon: Users, disabled: true },
  { href: '/appointments', label: 'Appointments', icon: Calendar, disabled: true },
  { href: '/settings', label: 'Settings', icon: Settings, disabled: true },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="flex h-full w-64 flex-col rounded-3xl bg-clay-surface p-4 shadow-clay">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-primary-light to-clay-primary text-sm font-bold text-white shadow-clay-sm">
          CC
        </div>
        <div>
          <p className="font-bold text-clay-text">CareConnect</p>
          <p className="text-xs text-clay-text-muted">Hospital Admin</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-2xl px-4 py-3 text-sm text-clay-text-muted/50"
              >
                <Icon className="h-5 w-5" />
                {item.label}
                <span className="ml-auto text-xs">Soon</span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-clay-primary-light text-clay-primary shadow-clay-inset'
                  : 'text-clay-text-muted hover:bg-clay-primary-light/50 hover:text-clay-primary',
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/40 pt-4">
        <Link
          href="/dashboard/hospital"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-clay-text-muted hover:bg-clay-primary-light/50 hover:text-clay-primary"
        >
          <Building2 className="h-5 w-5" />
          Hospital Profile
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-clay-error hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
