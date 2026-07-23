'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Package } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  CREATE_INVENTORY_ITEM_MUTATION,
  DELETE_INVENTORY_ITEM_MUTATION,
  INVENTORY_ITEMS_QUERY,
  ME_QUERY,
  UPDATE_INVENTORY_ITEM_MUTATION,
  UPDATE_INVENTORY_QUANTITY_MUTATION,
} from '@/lib/graphql/queries';

export default function InventoryPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unit, setUnit] = useState('each');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const { data, loading, refetch } = useQuery(INVENTORY_ITEMS_QUERY, {
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
  const [updateItem] = useMutation(UPDATE_INVENTORY_ITEM_MUTATION, {
    onCompleted: () => {
      setEditingId(null);
      refetch();
    },
  });
  const [deleteItem] = useMutation(DELETE_INVENTORY_ITEM_MUTATION, {
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

  const handleAdjust = async (id: string, currentQty: number, delta: number) => {
    const newQty = Math.max(0, currentQty + delta);
    try {
      await updateQuantity({
        variables: { hospitalId, input: { id, quantity: newQty } },
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
        <ClayButton onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Hide Form' : 'Add Item'}
        </ClayButton>
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">{error}</p>
      ) : null}

      {showForm ? (
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
                    <div className="flex gap-1">
                      <ClayButton
                        size="sm"
                        variant="secondary"
                        disabled={updating}
                        onClick={() => handleAdjust(item.id, item.quantity, -1)}
                      >
                        −
                      </ClayButton>
                      <ClayButton
                        size="sm"
                        variant="secondary"
                        disabled={updating}
                        onClick={() => handleAdjust(item.id, item.quantity, 1)}
                      >
                        +
                      </ClayButton>
                      <ClayButton
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditName(item.name);
                          setEditSku(item.sku ?? '');
                        }}
                      >
                        Edit
                      </ClayButton>
                      <ClayButton
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete “${item.name}”?`)) {
                            void deleteItem({ variables: { id: item.id, hospitalId } }).catch(
                              (err: unknown) =>
                                setError(err instanceof Error ? err.message : 'Delete failed'),
                            );
                          }
                        }}
                      >
                        Delete
                      </ClayButton>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </ClayCard>

      {editingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <ClayCard className="w-full max-w-md space-y-3">
            <h2 className="text-lg font-semibold text-clay-text">Edit item</h2>
            <ClayInput label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <ClayInput label="SKU" value={editSku} onChange={(e) => setEditSku(e.target.value)} />
            <div className="flex justify-end gap-2">
              <ClayButton variant="ghost" onClick={() => setEditingId(null)}>
                Cancel
              </ClayButton>
              <ClayButton
                onClick={() =>
                  void updateItem({
                    variables: {
                      hospitalId,
                      input: {
                        id: editingId,
                        name: editName.trim(),
                        sku: editSku.trim() || undefined,
                      },
                    },
                  }).catch((err: unknown) =>
                    setError(err instanceof Error ? err.message : 'Update failed'),
                  )
                }
              >
                Save
              </ClayButton>
            </div>
          </ClayCard>
        </div>
      ) : null}
    </div>
  );
}
