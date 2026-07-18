'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import {
  Activity,
  BedDouble,
  Calendar,
  DollarSign,
  UserCog,
  Users,
} from 'lucide-react';
import { ClayButton, ClayCard, ClayStatCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { BED_OCCUPANCY_QUERY, HOSPITAL_REPORTS_QUERY, ME_QUERY } from '@/lib/graphql/queries';

export default function ReportsPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data, loading } = useQuery(HOSPITAL_REPORTS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });
  const occupancyQuery = useQuery(BED_OCCUPANCY_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
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
    totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const asOf = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div>
      <DashboardHeader
        title="Reports"
        subtitle={`Live hospital snapshot · as of ${asOf}`}
      />

      {loading ? (
        <p className="text-clay-text-muted">Loading reports...</p>
      ) : (
        <>
          <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ClayStatCard
              title="Total Patients"
              value={reports?.patientCount ?? 0}
              icon={<Users className="h-5 w-5" />}
            />
            <ClayStatCard
              title="Staff Members"
              value={reports?.staffCount ?? 0}
              icon={<UserCog className="h-5 w-5" />}
            />
            <ClayStatCard
              title="Appointments Today"
              value={reports?.appointmentsToday ?? 0}
              icon={<Calendar className="h-5 w-5" />}
            />
            <ClayStatCard
              title="Active Admissions"
              value={reports?.activeAdmissions ?? 0}
              icon={<Activity className="h-5 w-5" />}
            />
            <ClayStatCard
              title="Bed Occupancy"
              value={`${occupancyRate}%`}
              icon={<BedDouble className="h-5 w-5" />}
            />
            <ClayStatCard
              title="Total Revenue"
              value={`$${(reports?.revenueTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<DollarSign className="h-5 w-5" />}
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            <Link href="/admissions/occupancy">
              <ClayButton variant="secondary" size="sm">
                Ward occupancy detail
              </ClayButton>
            </Link>
            <Link href="/finance">
              <ClayButton variant="secondary" size="sm">
                Finance overview
              </ClayButton>
            </Link>
            <Link href="/appointments">
              <ClayButton variant="secondary" size="sm">
                Today&apos;s appointments
              </ClayButton>
            </Link>
          </div>

          <ClayCard>
            <h2 className="mb-4 text-lg font-semibold text-clay-text">Beds by ward</h2>
            {occupancyQuery.loading ? (
              <p className="text-sm text-clay-text-muted">Loading occupancy...</p>
            ) : wards.length === 0 ? (
              <p className="text-sm text-clay-text-muted">
                No wards configured yet.{' '}
                <Link href="/settings/facility" className="text-clay-primary hover:underline">
                  Set up facility
                </Link>
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
        </>
      )}
    </div>
  );
}
