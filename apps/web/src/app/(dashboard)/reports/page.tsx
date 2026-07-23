'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Activity,
  BedDouble,
  Calendar,
  DollarSign,
  UserCog,
  Users,
} from 'lucide-react';
import { ClayButton, ClayCard, ClayInput, ClayStatCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { BED_OCCUPANCY_QUERY, HOSPITAL_REPORTS_QUERY, ME_QUERY } from '@/lib/graphql/queries';

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const [from, setFrom] = useState(todayDateString());
  const [to, setTo] = useState(todayDateString());
  const [useRange, setUseRange] = useState(false);

  const { data, loading, error } = useQuery(HOSPITAL_REPORTS_QUERY, {
    variables: {
      hospitalId,
      from: useRange ? from : undefined,
      to: useRange ? to : undefined,
    },
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

  const csv = useMemo(() => {
    const rows = [
      ['Metric', 'Value'],
      ['Patients', String(reports?.patientCount ?? 0)],
      ['Staff', String(reports?.staffCount ?? 0)],
      [
        useRange ? 'Appointments in range' : 'Appointments today',
        String(reports?.appointmentsToday ?? 0),
      ],
      ['Active admissions', String(reports?.activeAdmissions ?? 0)],
      ['Bed occupancy %', String(occupancyRate)],
      ['Revenue', String(reports?.revenueTotal ?? 0)],
      ...(useRange ? [['From', from], ['To', to]] : []),
    ];
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  }, [reports, occupancyRate, useRange, from, to]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careconnect-reports-${todayDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <DashboardHeader
        title="Reports"
        subtitle={`Live hospital snapshot · as of ${asOf}`}
      />

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">
          {error.message}
        </p>
      ) : null}

      <ClayCard className="mb-6 flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-sm text-clay-text">
          <input
            type="checkbox"
            checked={useRange}
            onChange={(e) => setUseRange(e.target.checked)}
          />
          Filter appointments & revenue by date range
        </label>
        {useRange ? (
          <>
            <ClayInput
              label="From"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <ClayInput label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        ) : null}
        <ClayButton type="button" variant="secondary" size="sm" onClick={downloadCsv}>
          Export CSV
        </ClayButton>
      </ClayCard>

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
              title={useRange ? 'Appointments in range' : 'Appointments Today'}
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
              title={useRange ? 'Revenue in range' : 'Total Revenue'}
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
                Finance
              </ClayButton>
            </Link>
          </div>

          <ClayCard>
            <h2 className="mb-4 text-lg font-semibold text-clay-text">Ward occupancy</h2>
            {wards.length === 0 ? (
              <p className="text-sm text-clay-text-muted">No ward data.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/40 text-clay-text-muted">
                      <th className="py-2 pr-4 font-medium">Ward</th>
                      <th className="py-2 pr-4 font-medium">Total</th>
                      <th className="py-2 pr-4 font-medium">Occupied</th>
                      <th className="py-2 font-medium">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wards.map((w) => (
                      <tr key={w.wardId} className="border-b border-white/20">
                        <td className="py-2 pr-4 text-clay-text">{w.wardName}</td>
                        <td className="py-2 pr-4">{w.totalBeds}</td>
                        <td className="py-2 pr-4">{w.occupiedBeds}</td>
                        <td className="py-2">{w.availableBeds}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ClayCard>
        </>
      )}
    </div>
  );
}
