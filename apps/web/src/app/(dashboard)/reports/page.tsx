'use client';

import { useQuery } from '@apollo/client';
import {
  Activity,
  Calendar,
  DollarSign,
  UserCog,
  Users,
} from 'lucide-react';
import { ClayStatCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { HOSPITAL_REPORTS_QUERY, ME_QUERY } from '@/lib/graphql/queries';

export default function ReportsPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data, loading } = useQuery(HOSPITAL_REPORTS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const reports = data?.hospitalReports;

  return (
    <div>
      <DashboardHeader
        title="Reports"
        subtitle="Hospital operations and revenue analytics"
      />

      {loading ? (
        <p className="text-clay-text-muted">Loading reports...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            title="Total Revenue"
            value={`$${(reports?.revenueTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>
      )}
    </div>
  );
}
