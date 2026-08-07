'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { ClayBadge, ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { QueryError } from '@/components/query-error';
import { INVOICE_QUERY, ME_QUERY, RECORD_PAYMENT_MUTATION, VOID_INVOICE_MUTATION } from '@/lib/graphql/queries';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const { data, loading, error: invoiceError, refetch } = useQuery(INVOICE_QUERY, {
    variables: { id, hospitalId },
    skip: !id || !hospitalId,
  });
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [error, setError] = useState('');
  const [recordPayment, { loading: paying }] = useMutation(RECORD_PAYMENT_MUTATION, {
    onCompleted: () => {
      setAmount('');
      refetch();
    },
    onError: (err) => setError(err.message),
  });
  const [voidInvoice, { loading: voiding }] = useMutation(VOID_INVOICE_MUTATION, {
    onCompleted: () => refetch(),
    onError: (err) => setError(err.message),
  });

  const invoice = data?.invoice;
  const canWriteBilling = (meData?.me?.permissions ?? []).includes('billing:write');

  if (loading) return <p className="text-clay-text-muted">Loading invoice...</p>;
  if (invoiceError) {
    return (
      <div>
        <DashboardHeader title="Invoice" subtitle="Invoice details" />
        <div className="mb-4">
          <Link href="/finance/invoices" className="text-sm text-clay-primary hover:underline">
            ← Back to invoices
          </Link>
        </div>
        <QueryError
          message="We could not load this invoice. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }
  if (!invoice) return <p className="text-clay-error">Invoice not found</p>;

  const paid = (invoice.payments ?? []).reduce(
    (sum: number, p: { amount: number }) => sum + Number(p.amount),
    0,
  );
  const balance = Number(invoice.totalAmount) - paid;

  return (
    <div>
      <DashboardHeader
        title={`Invoice · ${invoice.patient?.fullName ?? 'Patient'}`}
        subtitle={`Status: ${invoice.status}`}
      />
      <div className="mb-4">
        <Link href="/finance/invoices" className="text-sm text-clay-primary hover:underline">
          ← Back to invoices
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ClayCard className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <ClayBadge>{invoice.status}</ClayBadge>
            <div className="flex items-center gap-3">
              {canWriteBilling &&
              invoice.status !== 'void' &&
              invoice.status !== 'paid' &&
              (invoice.payments ?? []).length === 0 ? (
                <ClayButton
                  size="sm"
                  variant="ghost"
                  isLoading={voiding}
                  onClick={() => {
                    if (confirm('Void this invoice?')) {
                      voidInvoice({ variables: { id, hospitalId } });
                    }
                  }}
                >
                  Void
                </ClayButton>
              ) : null}
              <p className="text-lg font-semibold text-clay-text">
                ${Number(invoice.totalAmount).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="divide-y divide-white/30">
            {(invoice.items ?? []).map(
              (item: {
                id: string;
                description: string;
                quantity: number;
                unitPrice: number;
                amount: number;
              }) => (
                <div key={item.id} className="flex justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-clay-text">{item.description}</p>
                    <p className="text-clay-text-muted">
                      {item.quantity} × ${Number(item.unitPrice).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-clay-text">${Number(item.amount).toFixed(2)}</p>
                </div>
              ),
            )}
          </div>
        </ClayCard>

        <ClayCard className="space-y-4">
          <h2 className="text-lg font-semibold text-clay-text">Payments</h2>
          <p className="text-sm text-clay-text-muted">
            Paid ${paid.toFixed(2)} · Balance ${balance.toFixed(2)}
          </p>
          {(invoice.payments ?? []).map(
            (p: { id: string; amount: number; method: string; paidAt: string }) => (
              <div key={p.id} className="text-sm text-clay-text">
                ${Number(p.amount).toFixed(2)} · {p.method} ·{' '}
                {new Date(p.paidAt).toLocaleDateString()}
              </div>
            ),
          )}
          {canWriteBilling && balance > 0 && invoice.status !== 'void' ? (
            <form
              className="space-y-3 border-t border-white/40 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                setError('');
                recordPayment({
                  variables: {
                    hospitalId,
                    input: {
                      invoiceId: id,
                      amount: Number(amount),
                      method,
                    },
                  },
                });
              }}
            >
              <ClayInput
                label="Amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <label className="block text-sm font-medium text-clay-text">
                Method
                <select
                  className="mt-1 w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 shadow-clay-inset"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </label>
              {error ? <p className="text-sm text-clay-error">{error}</p> : null}
              <ClayButton type="submit" isLoading={paying} className="w-full">
                Record payment
              </ClayButton>
            </form>
          ) : null}
        </ClayCard>
      </div>
    </div>
  );
}
