import { Suspense } from 'react';
import { PortalLayoutClient } from './portal-layout-client';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-clay-bg text-clay-text-muted">
          Loading portal…
        </div>
      }
    >
      <PortalLayoutClient>{children}</PortalLayoutClient>
    </Suspense>
  );
}
