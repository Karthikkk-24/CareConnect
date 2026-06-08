import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen gap-6 bg-clay-bg p-6">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
