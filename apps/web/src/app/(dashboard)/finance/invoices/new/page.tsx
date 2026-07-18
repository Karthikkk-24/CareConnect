'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  CREATE_INVOICE_MUTATION,
  ME_QUERY,
  PATIENTS_QUERY,
} from '@/lib/graphql/queries';

type LineItem = {
  description: string;
  quantity: string;
  unitPrice: string;
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [status, setStatus] = useState('draft');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: '1', unitPrice: '0' },
  ]);
  const [error, setError] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data: patientsData } = useQuery(PATIENTS_QUERY, {
    variables: { search: patientSearch, limit: 8, hospitalId },
    skip: !hospitalId || patientSearch.length < 2,
  });

  const [createInvoice, { loading }] = useMutation(CREATE_INVOICE_MUTATION, {
    onCompleted: () => router.push('/finance/invoices'),
  });

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: '1', unitPrice: '0' }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const total = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!patientId.trim()) {
      setError('Patient is required');
      return;
    }

    const validItems = items.filter((item) => item.description.trim());
    if (!validItems.length) {
      setError('At least one line item is required');
      return;
    }

    try {
      await createInvoice({
        variables: {
          hospitalId,
          input: {
            patientId: patientId.trim(),
            status,
            items: validItems.map((item) => ({
              description: item.description.trim(),
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
            })),
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    }
  };

  return (
    <div>
      <DashboardHeader title="New Invoice" subtitle="Create a billing invoice for a patient" />

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">{error}</p>
      ) : null}

      <ClayCard className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="mb-1 block text-sm font-medium text-clay-text">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border-0 bg-clay-primary-light/50 px-4 py-3 text-sm text-clay-text shadow-clay-inset focus:outline-none focus:ring-2 focus:ring-clay-primary/30"
            >
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-clay-text">Line Items</h3>
              <ClayButton type="button" size="sm" variant="secondary" onClick={addItem}>
                Add Item
              </ClayButton>
            </div>
            {items.map((item, index) => (
              <div key={index} className="rounded-2xl bg-clay-primary-light/20 p-4 space-y-3">
                <ClayInput
                  label="Description *"
                  placeholder="Consultation, lab test..."
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ClayInput
                    label="Quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  />
                  <ClayInput
                    label="Unit Price ($)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                  />
                </div>
                {items.length > 1 ? (
                  <ClayButton type="button" size="sm" variant="ghost" onClick={() => removeItem(index)}>
                    Remove
                  </ClayButton>
                ) : null}
              </div>
            ))}
          </div>

          <p className="text-right text-lg font-semibold text-clay-text">
            Total: ${total.toFixed(2)}
          </p>

          <ClayButton type="submit" isLoading={loading}>
            Create Invoice
          </ClayButton>
        </form>
      </ClayCard>
    </div>
  );
}
