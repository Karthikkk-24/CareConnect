'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { FileText, Plus } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { INVOICES_QUERY, LIST_PAGE_LIMIT, ME_QUERY } from '@/lib/graphql/queries';

const statusVariant = (status: string) => {
  switch (status) {
    case 'paid':
      return 'success' as const;
    case 'void':
      return 'error' as const;
    case 'issued':
      return 'info' as const;
    default:
      return 'warning' as const;
  }
};

export default function InvoicesPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data, loading, error, refetch, fetchMore } = useQuery(INVOICES_QUERY, {
    variables: { hospitalId, pagination: { page: 1, limit: LIST_PAGE_LIMIT } },
    skip: !hospitalId,
  });

  const invoices = data?.invoices?.items ?? [];
  const canWriteBilling = (meData?.me?.permissions ?? []).includes('billing:write');
  const hasMore = Boolean(data?.invoices?.hasMore);

  return (
    <div>
      <DashboardHeader
        title="Invoices"
        subtitle="All billing invoices for your hospital"
      />

      {canWriteBilling ? (
        <div className="mb-6 flex justify-end">
          <Link href="/finance/invoices/new">
            <ClayButton>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </ClayButton>
          </Link>
        </div>
      ) : null}

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading invoices...</p>
        ) : error ? (
          <div className="space-y-3 px-6 py-12 text-center">
            <p className="text-sm text-clay-error">
              We could not load invoices. Please try again.
            </p>
            <ClayButton type="button" size="sm" onClick={() => void refetch()}>
              Try again
            </ClayButton>
          </div>
        ) : invoices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
            <p className="text-clay-text-muted">No invoices yet.</p>
            {canWriteBilling ? (
              <Link href="/finance/invoices/new" className="mt-4 inline-block">
                <ClayButton size="sm">Create First Invoice</ClayButton>
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {invoices.map(
              (invoice: {
                id: string;
                status: string;
                totalAmount: number;
                issuedAt?: string;
                createdAt: string;
                patient?: { fullName: string };
              }) => (
                <Link
                  key={invoice.id}
                  href={`/finance/invoices/${invoice.id}`}
                  className="flex items-center gap-4 px-6 py-4 transition hover:bg-clay-primary-light/20"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-clay-text">
                      {invoice.patient?.fullName ?? 'Unknown Patient'}
                    </p>
                    <p className="text-sm text-clay-text-muted">
                      {new Date(invoice.issuedAt ?? invoice.createdAt).toLocaleDateString()} · $
                      {invoice.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <ClayBadge variant={statusVariant(invoice.status)}>{invoice.status}</ClayBadge>
                </Link>
              ),
            )}
          </div>
        )}
        {hasMore ? (
          <div className="border-t border-white/30 px-6 py-4 text-center">
            <ClayButton
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                void fetchMore({
                  variables: {
                    hospitalId,
                    pagination: {
                      page: (data?.invoices?.page ?? 1) + 1,
                      limit: LIST_PAGE_LIMIT,
                    },
                  },
                  updateQuery: (prev, { fetchMoreResult }) => {
                    if (!fetchMoreResult) return prev;
                    return {
                      invoices: {
                        ...fetchMoreResult.invoices,
                        items: [
                          ...(prev.invoices?.items ?? []),
                          ...(fetchMoreResult.invoices?.items ?? []),
                        ],
                      },
                    };
                  },
                })
              }
            >
              Load more
            </ClayButton>
          </div>
        ) : null}
      </ClayCard>
    </div>
  );
}
