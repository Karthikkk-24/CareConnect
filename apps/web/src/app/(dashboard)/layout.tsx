import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
        {children}
      </main>
    </div>
  );
}
