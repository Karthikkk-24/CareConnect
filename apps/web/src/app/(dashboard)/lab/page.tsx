'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { FlaskConical } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { ClayTextarea } from '@/components/clinical/clay-textarea';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  COMPLETE_LAB_RESULT_MUTATION,
  CREATE_LAB_ORDER_MUTATION,
  LAB_ORDERS_QUERY,
  ME_QUERY,
  PATIENTS_QUERY,
} from '@/lib/graphql/queries';

const statusVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'cancelled':
      return 'error' as const;
    case 'processing':
    case 'collected':
      return 'info' as const;
    default:
      return 'warning' as const;
  }
};

export default function LabPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [resultValue, setResultValue] = useState('');
  const [referenceRange, setReferenceRange] = useState('');
  const [unit, setUnit] = useState('');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [testName, setTestName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [error, setError] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const canCreateOrders = (meData?.me?.permissions ?? []).includes('patients:write');

  const { data, loading, refetch } = useQuery(LAB_ORDERS_QUERY, {
    variables: { hospitalId, status: undefined },
    skip: !hospitalId,
  });

  const { data: patientsData } = useQuery(PATIENTS_QUERY, {
    variables: { search: patientSearch, limit: 8, hospitalId },
    skip: !hospitalId || !canCreateOrders || patientSearch.length < 2,
  });

  const [completeResult, { loading: completing }] = useMutation(COMPLETE_LAB_RESULT_MUTATION, {
    onCompleted: () => {
      refetch();
      setSelectedOrderId(null);
      setResultValue('');
      setReferenceRange('');
      setUnit('');
    },
  });

  const [createLabOrder, { loading: ordering }] = useMutation(CREATE_LAB_ORDER_MUTATION, {
    onCompleted: () => {
      refetch();
      setShowNewOrder(false);
      setPatientId('');
      setTestName('');
      setOrderNotes('');
    },
  });

  const orders = data?.labOrders ?? [];
  const pendingOrders = orders.filter((o: { status: string }) => o.status !== 'completed' && o.status !== 'cancelled');

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedOrderId || !resultValue.trim()) {
      setError('Select an order and enter a result value');
      return;
    }
    try {
      await completeResult({
        variables: {
          hospitalId,
          input: {
            labOrderId: selectedOrderId,
            resultValue: resultValue.trim(),
            referenceRange: referenceRange || undefined,
            unit: unit || undefined,
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save result');
    }
  };

  const handleNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!patientId.trim() || !testName.trim()) {
      setError('Patient ID and test name are required');
      return;
    }
    try {
      await createLabOrder({
        variables: {
          hospitalId,
          input: {
            patientId: patientId.trim(),
            testName: testName.trim(),
            notes: orderNotes || undefined,
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lab order');
    }
  };

  return (
    <div>
      <DashboardHeader title="Lab Queue" subtitle="Manage lab orders and enter results" />

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">{error}</p>
      ) : null}

      <div className="mb-6 flex justify-end">
        {canCreateOrders ? (
          <ClayButton onClick={() => setShowNewOrder(!showNewOrder)}>
            {showNewOrder ? 'Hide Order Form' : 'New Lab Order'}
          </ClayButton>
        ) : null}
      </div>

      {showNewOrder ? (
        <ClayCard className="mb-6 max-w-2xl">
          <h2 className="mb-4 text-lg font-semibold text-clay-text">New Lab Order</h2>
          <form onSubmit={handleNewOrder} className="space-y-4">
            <ClayInput
              label="Search Patient"
              placeholder="Type name to search..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
            {patientsData?.patients?.items?.length ? (
              <div className="rounded-2xl bg-clay-primary-light/30 p-2">
                {patientsData.patients.items.map((p: { id: string; fullName: string }) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPatientId(p.id);
                      setPatientSearch(p.fullName);
                    }}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm text-clay-text hover:bg-clay-primary-light/50"
                  >
                    {p.fullName}
                  </button>
                ))}
              </div>
            ) : null}
            <ClayInput
              label="Patient ID *"
              placeholder="UUID"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            />
            <ClayInput
              label="Test Name *"
              placeholder="CBC, BMP, Lipid Panel..."
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              required
            />
            <ClayTextarea
              label="Notes"
              rows={2}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
            />
            <ClayButton type="submit" isLoading={ordering}>
              Place Order
            </ClayButton>
          </form>
        </ClayCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <ClayCard padding="none" className="overflow-hidden">
          <div className="border-b border-white/40 bg-clay-primary-light/30 px-6 py-4">
            <h2 className="text-lg font-semibold text-clay-text">Order Queue</h2>
            <p className="text-sm text-clay-text-muted">{pendingOrders.length} pending</p>
          </div>
          {loading ? (
            <p className="px-6 py-8 text-center text-clay-text-muted">Loading orders...</p>
          ) : orders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FlaskConical className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
              <p className="text-clay-text-muted">No lab orders in queue.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/30">
              {orders.map(
                (order: {
                  id: string;
                  testName: string;
                  status: string;
                  createdAt: string;
                  patient?: { fullName: string };
                }) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-clay-primary-light/20 ${
                      selectedOrderId === order.id ? 'bg-clay-primary-light/40' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-clay-text">{order.testName}</p>
                      <p className="text-sm text-clay-text-muted">
                        {order.patient?.fullName ?? 'Unknown'} ·{' '}
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <ClayBadge variant={statusVariant(order.status)}>
                      {order.status}
                    </ClayBadge>
                  </button>
                ),
              )}
            </div>
          )}
        </ClayCard>

        <ClayCard>
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Enter Result</h2>
          {selectedOrderId ? (
            <form onSubmit={handleComplete} className="space-y-4">
              <p className="text-sm text-clay-text-muted">
                Order ID: <span className="font-mono text-clay-text">{selectedOrderId}</span>
              </p>
              <ClayInput
                label="Result Value *"
                placeholder="e.g. 12.5"
                value={resultValue}
                onChange={(e) => setResultValue(e.target.value)}
                required
              />
              <ClayInput
                label="Reference Range"
                placeholder="e.g. 10.0 - 15.0"
                value={referenceRange}
                onChange={(e) => setReferenceRange(e.target.value)}
              />
              <ClayInput
                label="Unit"
                placeholder="e.g. g/dL"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
              <ClayButton type="submit" isLoading={completing}>
                Complete & Save Result
              </ClayButton>
            </form>
          ) : (
            <p className="text-sm text-clay-text-muted">
              Select an order from the queue to enter results.
            </p>
          )}
        </ClayCard>
      </div>
    </div>
  );
}
