'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Package } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  CREATE_INVENTORY_ITEM_MUTATION,
  INVENTORY_ITEMS_QUERY,
  ME_QUERY,
  UPDATE_INVENTORY_QUANTITY_MUTATION,
} from '@/lib/graphql/queries';
import { QueryError } from '@/components/query-error';

export default function InventoryPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unit, setUnit] = useState('each');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [error, setError] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const canWrite = (meData?.me?.permissions ?? []).includes('patients:write');

  const { data, loading, error: listError, refetch } = useQuery(INVENTORY_ITEMS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });

  const [createItem, { loading: creating }] = useMutation(CREATE_INVENTORY_ITEM_MUTATION, {
    onCompleted: () => {
      refetch();
      setShowForm(false);
      setName('');
      setSku('');
      setQuantity('0');
      setUnit('each');
      setReorderLevel('10');
    },
  });

  const [updateQuantity, { loading: updating }] = useMutation(UPDATE_INVENTORY_QUANTITY_MUTATION, {
    onCompleted: () => refetch(),
  });

  const items = data?.inventoryItems ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      await createItem({
        variables: {
          hospitalId,
          input: {
            name: name.trim(),
            sku: sku || undefined,
            quantity: Number(quantity),
            unit: unit || 'each',
            reorderLevel: Number(reorderLevel),
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    }
  };

  const handleAdjust = async (id: string, delta: number) => {
    try {
      await updateQuantity({
        variables: { hospitalId, input: { id, delta } },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quantity');
    }
  };

  return (
    <div>
      <DashboardHeader
        title="Inventory"
        subtitle="Hospital supplies and stock levels"
      />

      <div className="mb-6 flex justify-end">
        {canWrite ? (
          <ClayButton onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Hide Form' : 'Add Item'}
          </ClayButton>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">{error}</p>
      ) : null}

      {showForm && canWrite ? (
        <ClayCard className="mb-6 max-w-2xl">
          <h2 className="mb-4 text-lg font-semibold text-clay-text">Add Inventory Item</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <ClayInput
              label="Name *"
              placeholder="Surgical gloves, syringes..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <ClayInput
              label="SKU"
              placeholder="Optional SKU"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <ClayInput
                label="Quantity"
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <ClayInput
                label="Unit"
                placeholder="each, box..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
              <ClayInput
                label="Reorder Level"
                type="number"
                min="0"
                step="0.01"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </div>
            <ClayButton type="submit" isLoading={creating}>
              Add Item
            </ClayButton>
          </form>
        </ClayCard>
      ) : null}

      <ClayCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-center text-clay-text-muted">Loading inventory...</p>
        ) : listError ? (
          <div className="px-6 py-8">
            <QueryError
              message="We could not load inventory. Please try again."
              onRetry={() => void refetch()}
            />
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
            <p className="text-clay-text-muted">No inventory items yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {items.map(
              (item: {
                id: string;
                name: string;
                sku?: string;
                quantity: number;
                unit: string;
                reorderLevel: number;
              }) => {
                const lowStock = item.quantity <= item.reorderLevel;
                return (
                  <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-clay-text">{item.name}</p>
                      <p className="text-sm text-clay-text-muted">
                        {item.sku ? `SKU: ${item.sku} · ` : ''}
                        Reorder at {item.reorderLevel} {item.unit}
                      </p>
                    </div>
                    <ClayBadge variant={lowStock ? 'warning' : 'success'}>
                      {item.quantity} {item.unit}
                    </ClayBadge>
                    {canWrite ? (
                      <div className="flex gap-1">
                        <ClayButton
                          size="sm"
                          variant="secondary"
                          disabled={updating}
                          onClick={() => handleAdjust(item.id, -1)}
                        >
                          −
                        </ClayButton>
                        <ClayButton
                          size="sm"
                          variant="secondary"
                          disabled={updating}
                          onClick={() => handleAdjust(item.id, 1)}
                        >
                          +
                        </ClayButton>
                      </div>
                    ) : null}
                  </div>
                );
              },
            )}
          </div>
        )}
      </ClayCard>
    </div>
  );
}
