import { PortalSidebar } from '@/components/layout/portal-sidebar';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen gap-6 bg-clay-bg p-6">
      <PortalSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
