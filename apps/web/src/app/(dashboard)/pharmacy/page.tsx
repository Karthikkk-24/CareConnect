'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Pill } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  DISPENSE_PRESCRIPTION_MUTATION,
  ME_QUERY,
  PENDING_PRESCRIPTIONS_QUERY,
  PHARMACY_STOCK_QUERY,
  UPSERT_PHARMACY_STOCK_MUTATION,
} from '@/lib/graphql/queries';
import { QueryError } from '@/components/query-error';

export default function PharmacyPage() {
  const [drugName, setDrugName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('each');
  const [error, setError] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const canWrite = (meData?.me?.permissions ?? []).includes('patients:write');

  const { data: rxData, loading: rxLoading, error: rxError, refetch: refetchRx } = useQuery(
    PENDING_PRESCRIPTIONS_QUERY,
    { variables: { hospitalId }, skip: !hospitalId },
  );

  const { data: stockData, loading: stockLoading, error: stockError, refetch: refetchStock } = useQuery(
    PHARMACY_STOCK_QUERY,
    { variables: { hospitalId }, skip: !hospitalId },
  );

  const [dispense, { loading: dispensing }] = useMutation(DISPENSE_PRESCRIPTION_MUTATION, {
    onCompleted: () => refetchRx(),
  });

  const [upsertStock, { loading: savingStock }] = useMutation(UPSERT_PHARMACY_STOCK_MUTATION, {
    onCompleted: () => {
      refetchStock();
      setDrugName('');
      setQuantity('');
      setUnit('each');
    },
  });

  const prescriptions = rxData?.pendingPrescriptions ?? [];
  const stock = stockData?.pharmacyStock ?? [];

  const handleDispense = async (prescriptionId: string) => {
    setError('');
    try {
      await dispense({
        variables: { hospitalId, input: { prescriptionId } },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispense prescription');
    }
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!drugName.trim() || !quantity.trim()) {
      setError('Drug name and quantity are required');
      return;
    }
    try {
      await upsertStock({
        variables: {
          hospitalId,
          input: {
            drugName: drugName.trim(),
            quantity: Number(quantity),
            unit: unit || 'each',
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stock');
    }
  };

  return (
    <div>
      <DashboardHeader title="Pharmacy" subtitle="Pending prescriptions and drug stock" />

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">{error}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <ClayCard padding="none" className="overflow-hidden">
          <div className="border-b border-white/40 bg-clay-primary-light/30 px-6 py-4">
            <h2 className="text-lg font-semibold text-clay-text">Pending Prescriptions</h2>
            <p className="text-sm text-clay-text-muted">
              {rxError ? '—' : `${prescriptions.length} awaiting dispense`}
            </p>
          </div>
          {rxLoading ? (
            <p className="px-6 py-8 text-center text-clay-text-muted">Loading...</p>
          ) : rxError ? (
            <div className="px-6 py-8">
              <QueryError
                message="We could not load pending prescriptions. Please try again."
                onRetry={() => void refetchRx()}
              />
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Pill className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
              <p className="text-clay-text-muted">No pending prescriptions.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/30">
              {prescriptions.map(
                (rx: {
                  id: string;
                  createdAt: string;
                  patient?: { fullName: string };
                  items: { drugName: string; dosage?: string }[];
                }) => (
                  <div key={rx.id} className="flex items-start gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-clay-text">
                        {rx.patient?.fullName ?? 'Unknown Patient'}
                      </p>
                      <p className="text-sm text-clay-text-muted">
                        {new Date(rx.createdAt).toLocaleString()}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {rx.items.map((item, i) => (
                          <li key={i} className="text-sm text-clay-text">
                            {item.drugName}
                            {item.dosage ? ` · ${item.dosage}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {canWrite ? (
                      <ClayButton
                        size="sm"
                        isLoading={dispensing}
                        onClick={() => handleDispense(rx.id)}
                      >
                        Dispense
                      </ClayButton>
                    ) : null}
                  </div>
                ),
              )}
            </div>
          )}
        </ClayCard>

        <div className="space-y-6">
          {canWrite ? (
          <ClayCard>
            <h2 className="mb-4 text-lg font-semibold text-clay-text">Update Stock</h2>
            <form onSubmit={handleStockSubmit} className="space-y-4">
              <ClayInput
                label="Drug Name *"
                placeholder="Amoxicillin 500mg"
                value={drugName}
                onChange={(e) => setDrugName(e.target.value)}
                required
              />
              <ClayInput
                label="Quantity *"
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <ClayInput
                label="Unit"
                placeholder="tablets, bottles..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
              <ClayButton type="submit" isLoading={savingStock}>
                Save Stock
              </ClayButton>
            </form>
          </ClayCard>
          ) : null}

          <ClayCard padding="none" className="overflow-hidden">
            <div className="border-b border-white/40 bg-clay-primary-light/30 px-6 py-4">
              <h2 className="text-lg font-semibold text-clay-text">Current Stock</h2>
            </div>
            {stockLoading ? (
              <p className="px-6 py-8 text-center text-clay-text-muted">Loading...</p>
            ) : stockError ? (
              <div className="px-6 py-8">
                <QueryError
                  message="We could not load pharmacy stock. Please try again."
                  onRetry={() => void refetchStock()}
                />
              </div>
            ) : stock.length === 0 ? (
              <p className="px-6 py-8 text-center text-clay-text-muted">No stock entries yet.</p>
            ) : (
              <div className="divide-y divide-white/30">
                {stock.map(
                  (item: { id: string; drugName: string; quantity: number; unit: string }) => (
                    <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-clay-text">{item.drugName}</p>
                      </div>
                      <ClayBadge variant={item.quantity <= 10 ? 'warning' : 'success'}>
                        {item.quantity} {item.unit}
                      </ClayBadge>
                    </div>
                  ),
                )}
              </div>
            )}
          </ClayCard>
        </div>
      </div>
    </div>
  );
}
