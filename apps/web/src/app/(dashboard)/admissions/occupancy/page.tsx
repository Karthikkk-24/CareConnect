'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { BED_OCCUPANCY_QUERY, ME_QUERY } from '@/lib/graphql/queries';

export default function BedOccupancyPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data, loading } = useQuery(BED_OCCUPANCY_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const wards = data?.wardOccupancy ?? [];

  const summary = {
    total: wards.reduce((s: number, w: { totalBeds: number }) => s + w.totalBeds, 0),
    available: wards.reduce((s: number, w: { availableBeds: number }) => s + w.availableBeds, 0),
    occupied: wards.reduce((s: number, w: { occupiedBeds: number }) => s + w.occupiedBeds, 0),
  };

  return (
    <div>
      <DashboardHeader title="Bed Occupancy" subtitle="Ward occupancy overview" />
      <p className="mb-6 text-sm text-clay-text-muted">
        <Link href="/admissions" className="text-clay-primary hover:underline">
          ← Back to Admissions
        </Link>
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Beds', value: summary.total },
          { label: 'Available', value: summary.available },
          { label: 'Occupied', value: summary.occupied },
        ].map((stat) => (
          <ClayCard key={stat.label} className="text-center">
            <p className="text-2xl font-bold text-clay-text">{loading ? '—' : stat.value}</p>
            <p className="text-sm text-clay-text-muted">{stat.label}</p>
          </ClayCard>
        ))}
      </div>

      <ClayCard padding="none" className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/40 bg-clay-primary-light/30">
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Ward</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Total</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Occupied</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-clay-text">Available</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-clay-text-muted">
                  Loading...
                </td>
              </tr>
            ) : wards.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-clay-text-muted">
                  No wards configured. Create wards and beds under Settings / Facility.
                </td>
              </tr>
            ) : (
              wards.map((w: {
                wardId: string;
                wardName: string;
                totalBeds: number;
                occupiedBeds: number;
                availableBeds: number;
              }) => (
                <tr key={w.wardId} className="border-b border-white/20">
                  <td className="px-6 py-4 text-sm font-medium text-clay-text">{w.wardName}</td>
                  <td className="px-6 py-4 text-sm text-clay-text-muted">{w.totalBeds}</td>
                  <td className="px-6 py-4 text-sm text-clay-text-muted">{w.occupiedBeds}</td>
                  <td className="px-6 py-4 text-sm text-clay-text-muted">{w.availableBeds}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ClayCard>
    </div>
  );
}
