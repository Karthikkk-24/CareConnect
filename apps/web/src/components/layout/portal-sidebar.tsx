'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  FolderOpen,
  Pill,
  FlaskConical,
  User,
  LogOut,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { cn } from '@careconnect/ui';

const navItems = [
  { href: '/portal', label: 'Overview', icon: LayoutDashboard },
  { href: '/portal/appointments', label: 'Appointments', icon: Calendar },
  { href: '/portal/records', label: 'Records', icon: FileText },
  { href: '/portal/documents', label: 'Documents', icon: FolderOpen },
  { href: '/portal/prescriptions', label: 'Prescriptions', icon: Pill },
  { href: '/portal/lab-results', label: 'Lab Results', icon: FlaskConical },
  { href: '/portal/profile', label: 'Profile', icon: User },
];

export function PortalSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const clerk = useClerk();

  const handleLogout = async () => {
    await clerk.signOut();
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
          <p className="text-xs text-clay-text-muted">Patient Portal</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/portal'
              ? pathname === '/portal'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

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

      <div className="mt-auto border-t border-white/40 pt-4">
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
