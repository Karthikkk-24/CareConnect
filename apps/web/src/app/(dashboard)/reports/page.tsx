'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import {
  Activity,
  BedDouble,
  Calendar,
  ClipboardList,
  DollarSign,
  UserCog,
  Users,
} from 'lucide-react';
import { ClayButton, ClayCard, ClayStatCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  AUDIT_LOGS_QUERY,
  BED_OCCUPANCY_QUERY,
  HOSPITAL_REPORTS_QUERY,
  ME_QUERY,
} from '@/lib/graphql/queries';
import { canAccessRoute } from '@/lib/route-access';

const AUDIT_VIEW_ROLES = new Set([
  'hospital_admin',
  'hospital_manager',
  'super_admin',
]);

export default function ReportsPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const roles: string[] = meData?.me?.roles ?? [];
  const permissions: string[] = meData?.me?.permissions ?? [];
  const canViewAudit =
    permissions.includes('reports:read') &&
    roles.some((r) => AUDIT_VIEW_ROLES.has(r));

  const { data, loading, error } = useQuery(HOSPITAL_REPORTS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });
  const occupancyQuery = useQuery(BED_OCCUPANCY_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });
  const auditQuery = useQuery(AUDIT_LOGS_QUERY, {
    variables: { hospitalId, limit: 25 },
    skip: !hospitalId || !canViewAudit,
  });

  const reports = data?.hospitalReports;
  const wards: Array<{
    wardId: string;
    wardName: string;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
  }> = occupancyQuery.data?.wardOccupancy ?? [];

  const totalBeds = wards.reduce((sum, w) => sum + Number(w.totalBeds), 0);
  const occupiedBeds = wards.reduce((sum, w) => sum + Number(w.occupiedBeds), 0);
  const occupancyRate =
    occupancyQuery.error || !occupancyQuery.data
      ? '—'
      : totalBeds > 0
        ? Math.round((occupiedBeds / totalBeds) * 100)
        : 0;

  const stat = (value: number | undefined) =>
    error || value == null ? '—' : value;
  const revenueDisplay =
    error || reports?.revenueTotal == null
      ? '—'
      : `$${Number(reports.revenueTotal).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
  const occupancyDisplay =
    occupancyRate === '—' ? '—' : `${occupancyRate}%`;

  const asOf = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const accessCtx = {
    roles: meData?.me?.roles ?? [],
    permissions: meData?.me?.permissions ?? [],
  };

  const secondaryLinks = [
    { href: '/admissions/occupancy', label: 'Ward occupancy detail' },
    { href: '/finance', label: 'Finance overview' },
    { href: '/appointments', label: "Today's appointments" },
  ].filter((link) => canAccessRoute(link.href, accessCtx));

  return (
    <div>
      <DashboardHeader
        title="Reports"
        subtitle={`Live hospital snapshot · as of ${asOf}`}
      />

      {loading ? (
        <p className="text-clay-text-muted">Loading reports...</p>
      ) : error ? (
        <p className="text-sm text-clay-error">
          We could not load hospital reports. Please try again.
        </p>
      ) : (
        <>
          <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ClayStatCard
              title="Total Patients"
              value={stat(reports?.patientCount)}
              icon={<Users className="h-5 w-5" />}
            />
            <ClayStatCard
              title="Staff Members"
              value={stat(reports?.staffCount)}
              icon={<UserCog className="h-5 w-5" />}
            />
            <ClayStatCard
              title="Appointments Today"
              value={stat(reports?.appointmentsToday)}
              icon={<Calendar className="h-5 w-5" />}
            />
            <ClayStatCard
              title="Active Admissions"
              value={stat(reports?.activeAdmissions)}
              icon={<Activity className="h-5 w-5" />}
            />
            <ClayStatCard
              title="Bed Occupancy"
              value={occupancyDisplay}
              icon={<BedDouble className="h-5 w-5" />}
            />
            <ClayStatCard
              title="Total Revenue"
              value={revenueDisplay}
              icon={<DollarSign className="h-5 w-5" />}
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            {secondaryLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <ClayButton variant="secondary" size="sm">
                  {link.label}
                </ClayButton>
              </Link>
            ))}
          </div>

          <ClayCard>
            <h2 className="mb-4 text-lg font-semibold text-clay-text">Beds by ward</h2>
            {occupancyQuery.loading ? (
              <p className="text-sm text-clay-text-muted">Loading occupancy...</p>
            ) : occupancyQuery.error ? (
              <div className="space-y-3">
                <p className="text-sm text-clay-error">
                  We could not load bed occupancy. Please try again.
                </p>
                <ClayButton
                  type="button"
                  size="sm"
                  onClick={() => void occupancyQuery.refetch()}
                >
                  Try again
                </ClayButton>
              </div>
            ) : wards.length === 0 ? (
              <p className="text-sm text-clay-text-muted">
                No wards configured yet.
                {canAccessRoute('/settings', {
                  roles: meData?.me?.roles ?? [],
                  permissions: meData?.me?.permissions ?? [],
                }) ? (
                  <>
                    {' '}
                    <Link href="/settings/facility" className="text-clay-primary hover:underline">
                      Set up facility
                    </Link>
                  </>
                ) : (
                  ' Ask an administrator to configure wards and beds.'
                )}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/40 text-clay-text-muted">
                      <th className="pb-2 font-medium">Ward</th>
                      <th className="pb-2 font-medium">Total</th>
                      <th className="pb-2 font-medium">Occupied</th>
                      <th className="pb-2 font-medium">Available</th>
                      <th className="pb-2 font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wards.map((w) => {
                      const rate =
                        w.totalBeds > 0
                          ? Math.round((Number(w.occupiedBeds) / Number(w.totalBeds)) * 100)
                          : 0;
                      return (
                        <tr key={w.wardId} className="border-b border-white/20 text-clay-text">
                          <td className="py-2 font-medium">{w.wardName}</td>
                          <td className="py-2">{w.totalBeds}</td>
                          <td className="py-2">{w.occupiedBeds}</td>
                          <td className="py-2">{w.availableBeds}</td>
                          <td className="py-2">{rate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 text-xs text-clay-text-muted">
              Charts, date filters, and CSV export are not available yet. Totals reflect the current
              hospital database state.
            </p>
          </ClayCard>

          {canViewAudit ? (
            <ClayCard className="mt-6">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-clay-primary" />
                <h2 className="text-lg font-semibold text-clay-text">
                  Recent audit activity
                </h2>
              </div>
              {auditQuery.loading ? (
                <p className="text-sm text-clay-text-muted">Loading audit log...</p>
              ) : auditQuery.error ? (
                <div className="space-y-3">
                  <p className="text-sm text-clay-error">
                    We could not load audit events. Please try again.
                  </p>
                  <ClayButton
                    type="button"
                    size="sm"
                    onClick={() => void auditQuery.refetch()}
                  >
                    Try again
                  </ClayButton>
                </div>
              ) : (auditQuery.data?.auditLogs?.items ?? []).length === 0 ? (
                <p className="text-sm text-clay-text-muted">
                  No audit events recorded for this hospital yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/40 text-clay-text-muted">
                        <th className="pb-2 font-medium">When</th>
                        <th className="pb-2 font-medium">Actor</th>
                        <th className="pb-2 font-medium">Action</th>
                        <th className="pb-2 font-medium">Resource</th>
                        <th className="pb-2 font-medium">Resource ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        auditQuery.data?.auditLogs?.items as Array<{
                          id: string;
                          createdAt: string;
                          actorName?: string;
                          actorEmail?: string;
                          action: string;
                          resource: string;
                          resourceId?: string;
                        }>
                      ).map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-white/20 text-clay-text"
                        >
                          <td className="py-2 whitespace-nowrap">
                            {new Date(row.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2">
                            {row.actorName || row.actorEmail || '—'}
                          </td>
                          <td className="py-2 font-medium">{row.action}</td>
                          <td className="py-2">{row.resource}</td>
                          <td className="py-2 font-mono text-xs">
                            {row.resourceId ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-clay-text-muted">
                    Showing{' '}
                    {Math.min(
                      auditQuery.data?.auditLogs?.items?.length ?? 0,
                      25,
                    )}{' '}
                    of {auditQuery.data?.auditLogs?.total ?? 0} events
                    (metadata omitted from this view).
                  </p>
                </div>
              )}
            </ClayCard>
          ) : null}
        </>
      )}
    </div>
  );
}
