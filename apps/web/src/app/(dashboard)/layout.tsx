'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { ForbiddenAccess } from '@/components/auth/forbidden-access';
import { ME_QUERY } from '@/lib/graphql/queries';
import { canAccessRoute } from '@/lib/route-access';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, loading, error } = useQuery(ME_QUERY, { errorPolicy: 'all' });
  const me = data?.me;

  const roles: string[] = me?.roles ?? [];
  const permissions: string[] = me?.permissions ?? [];
  // Fail closed: never treat missing/failed me as authorized
  const allowed = !!me && canAccessRoute(pathname, { roles, permissions });

  useEffect(() => {
    if (!me) return;
    if (!me.onboardingCompleted && !pathname.startsWith('/onboarding')) {
      router.replace('/onboarding');
      return;
    }
    if (me.onboardingCompleted && Array.isArray(me.roles) && me.roles.includes('patient')) {
      router.replace('/portal');
    }
  }, [me, pathname, router]);

  return (
    <div className="flex min-h-screen gap-6 bg-clay-bg p-6">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:rounded-xl focus:bg-clay-surface focus:px-4 focus:py-2 focus:shadow-clay-sm"
      >
        Skip to main content
      </a>
      <DashboardSidebar />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto outline-none">
        {loading && !me ? (
          <p className="text-clay-text-muted">Loading...</p>
        ) : error && !me ? (
          <ForbiddenAccess />
        ) : !allowed ? (
          <ForbiddenAccess />
        ) : (
          children
        )}
      </main>
    </div>
  );
}
