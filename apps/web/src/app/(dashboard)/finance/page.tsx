'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { DollarSign, FileText, Plus } from 'lucide-react';
import { ClayButton, ClayCard, ClayStatCard } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { HOSPITAL_REPORTS_QUERY, INVOICES_QUERY, ME_QUERY } from '@/lib/graphql/queries';
import { canAccessRoute } from '@/lib/route-access';

export default function FinancePage() {
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data: invoicesData, error: invoicesError } = useQuery(INVOICES_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const { data: reportsData, error: reportsError } = useQuery(HOSPITAL_REPORTS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const invoices = invoicesData?.invoices ?? [];
  const outstanding = invoicesError
    ? null
    : invoices.filter(
        (inv: { status: string }) => inv.status === 'draft' || inv.status === 'issued',
      ).length;
  const paid = invoicesError
    ? null
    : invoices.filter((inv: { status: string }) => inv.status === 'paid').length;
  const revenueTotal = reportsData?.hospitalReports?.revenueTotal;
  const revenueDisplay =
    reportsError || revenueTotal == null
      ? '—'
      : `$${Number(revenueTotal).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
  const invoiceCountDisplay = (value: number | null) =>
    value == null ? '—' : value;
  const canWriteBilling = (meData?.me?.permissions ?? []).includes('billing:write');
  const accessCtx = {
    roles: meData?.me?.roles ?? [],
    permissions: meData?.me?.permissions ?? [],
  };
  const canSeeReports = canAccessRoute('/reports', accessCtx);

  const quickLinks = [
    { label: 'View All Invoices', href: '/finance/invoices' },
    ...(canWriteBilling
      ? [{ label: 'Create Invoice', href: '/finance/invoices/new' }]
      : []),
    ...(canSeeReports ? [{ label: 'Reports Hub', href: '/reports' }] : []),
  ];

  return (
    <div>
      <DashboardHeader
        title="Finance"
        subtitle="Billing overview and invoice management"
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

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <ClayStatCard
          title="Total Revenue"
          value={revenueDisplay}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <ClayStatCard
          title="Outstanding Invoices"
          value={invoiceCountDisplay(outstanding)}
          icon={<FileText className="h-5 w-5" />}
        />
        <ClayStatCard
          title="Paid Invoices"
          value={invoiceCountDisplay(paid)}
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      <ClayCard>
        <h2 className="mb-4 text-lg font-semibold text-clay-text">Quick Links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="rounded-2xl bg-clay-primary-light px-4 py-3 text-sm font-medium text-clay-primary shadow-clay-inset transition hover:bg-clay-primary/10"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </ClayCard>
    </div>
  );
}
