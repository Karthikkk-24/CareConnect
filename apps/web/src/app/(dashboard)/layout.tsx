'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { ME_QUERY } from '@/lib/graphql/queries';
import { isPatientOnly } from '@/lib/permissions';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useQuery(ME_QUERY, { errorPolicy: 'all' });
  const me = data?.me;

  useEffect(() => {
    if (!me) return;
    if (!me.onboardingCompleted && !pathname.startsWith('/onboarding')) {
      router.replace('/onboarding');
      return;
    }
    if (me.onboardingCompleted && isPatientOnly(me.roles)) {
      router.replace('/portal');
    }
  }, [me, pathname, router]);

  return (
    <div className="flex min-h-screen gap-6 bg-clay-bg p-6 pt-16 lg:pt-6">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:rounded-xl focus:bg-clay-surface focus:px-4 focus:py-2 focus:shadow-clay-sm"
      >
        {t('skipToContent')}
      </a>
      <DashboardSidebar />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto outline-none">
        {children}
      </main>
    </div>
  );
}
