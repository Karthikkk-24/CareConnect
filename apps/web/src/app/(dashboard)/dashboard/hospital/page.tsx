'use client';

import { ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';

export default function HospitalProfilePage() {
  return (
    <div>
      <DashboardHeader
        title="Hospital Profile"
        subtitle="Manage your hospital information"
      />
      <ClayCard>
        <p className="text-clay-text-muted">
          Hospital profile editing will be expanded in a future phase. Your hospital was
          created during onboarding.
        </p>
      </ClayCard>
    </div>
  );
}
