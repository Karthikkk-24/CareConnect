'use client';

import { useMutation, useQuery } from '@apollo/client';
import { CalendarClock } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  FOLLOW_UPS_QUERY,
  ME_QUERY,
  UPDATE_FOLLOW_UP_STATUS_MUTATION,
} from '@/lib/graphql/queries';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'missed':
      return 'error' as const;
    case 'rescheduled':
      return 'info' as const;
    default:
      return 'default' as const;
  }
};

export default function FollowUpsPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data, loading, refetch } = useQuery(FOLLOW_UPS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const [updateStatus] = useMutation(UPDATE_FOLLOW_UP_STATUS_MUTATION, {
    onCompleted: () => refetch(),
  });

  const followUps = data?.followUps ?? [];

  const handleStatus = async (id: string, status: string) => {
    await updateStatus({ variables: { hospitalId, input: { id, status } } });
  };

  return (
    <div>
      <DashboardHeader
        title="Follow-ups"
        subtitle="Scheduled post-discharge and outpatient follow-up visits"
      />

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading follow-ups...</p>
        ) : followUps.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarClock className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
            <p className="text-clay-text-muted">No follow-ups scheduled.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {followUps.map(
              (item: {
                id: string;
                patientName?: string;
                doctorName?: string;
                scheduledAt: string;
                type?: string;
                status: string;
              }) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-clay-primary-light/20"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-clay-primary-light text-clay-primary shadow-clay-inset">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-clay-text">
                      {formatDateTime(item.scheduledAt)} — {item.patientName ?? 'Unknown patient'}
                    </p>
                    <p className="text-sm text-clay-text-muted">
                      {item.doctorName ? `Dr. ${item.doctorName}` : 'No doctor assigned'}
                      {item.type ? ` · ${item.type.replace(/_/g, ' ')}` : ''}
                    </p>
                  </div>
                  <ClayBadge variant={statusVariant(item.status)}>
                    {item.status.replace(/_/g, ' ')}
                  </ClayBadge>
                  {item.status === 'scheduled' ? (
                    <div className="flex gap-2">
                      <ClayButton size="sm" onClick={() => handleStatus(item.id, 'completed')}>
                        Complete
                      </ClayButton>
                      <ClayButton
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStatus(item.id, 'missed')}
                      >
                        Missed
                      </ClayButton>
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
