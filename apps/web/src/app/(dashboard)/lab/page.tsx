'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useAuth } from '@clerk/nextjs';
import { FileText, FlaskConical, Upload } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { ClayTextarea } from '@/components/clinical/clay-textarea';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  COMPLETE_LAB_RESULT_MUTATION,
  CREATE_LAB_ORDER_MUTATION,
  LAB_ORDERS_QUERY,
  ME_QUERY,
  PATIENTS_QUERY,
  UPDATE_LAB_ORDER_STATUS_MUTATION,
} from '@/lib/graphql/queries';
import { QueryError } from '@/components/query-error';
import { canAuthorClinical } from '@/lib/clinical-access';

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

/** Next workflow step before completeLabResult (matches API status machine). */
function nextLabStatus(status: string): { status: string; label: string } | null {
  if (status === 'ordered') return { status: 'collected', label: 'Mark collected' };
  if (status === 'collected') return { status: 'processing', label: 'Mark processing' };
  return null;
}

type LabOrderRow = {
  id: string;
  testName: string;
  status: string;
  createdAt: string;
  patient?: { fullName: string };
  result?: {
    resultValue?: string;
    resultFileUrl?: string;
  };
};

export default function LabPage() {
  const { getToken } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [resultValue, setResultValue] = useState('');
  const [referenceRange, setReferenceRange] = useState('');
  const [unit, setUnit] = useState('');
  const [resultFileUrl, setResultFileUrl] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [testName, setTestName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');

  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;
  const roles: string[] = meData?.me?.roles ?? [];
  const permissions: string[] = meData?.me?.permissions ?? [];
  const canCreateOrders =
    permissions.includes('patients:write') && canAuthorClinical(roles);
  const canWriteLab = permissions.includes('lab:write');

  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
  ).replace(/\/graphql\/?$/, '');

  const { data, loading, error: listError, refetch } = useQuery(LAB_ORDERS_QUERY, {
    variables: { hospitalId, status: undefined },
    skip: !hospitalId,
  });

  const { data: patientsData, error: patientsError, refetch: refetchPatients } = useQuery(
    PATIENTS_QUERY,
    {
      variables: { search: patientSearch, limit: 8, hospitalId },
      skip: !hospitalId || !canCreateOrders || patientSearch.length < 2,
    },
  );

  const resetCompleteForm = () => {
    setSelectedOrderId(null);
    setResultValue('');
    setReferenceRange('');
    setUnit('');
    setResultFileUrl(null);
    setResultFileName('');
    setFileError('');
  };

  const [completeResult, { loading: completing }] = useMutation(COMPLETE_LAB_RESULT_MUTATION, {
    onCompleted: () => {
      refetch();
      resetCompleteForm();
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

  const [updateLabStatus, { loading: updatingStatus }] = useMutation(
    UPDATE_LAB_ORDER_STATUS_MUTATION,
    { onCompleted: () => refetch() },
  );

  const orders: LabOrderRow[] = data?.labOrders ?? [];
  const pendingOrders = orders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled',
  );

  const handleAdvanceStatus = async (
    labOrderId: string,
    status: string,
  ): Promise<boolean> => {
    setError('');
    try {
      await updateLabStatus({
        variables: {
          hospitalId,
          input: { labOrderId, status },
        },
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lab order status');
      return false;
    }
  };

  const handleOpenResultFile = async (fileUrl: string) => {
    setFileError('');
    const token = await getToken();
    let pathname: string;
    try {
      pathname = fileUrl.startsWith('/uploads/')
        ? fileUrl.split('?')[0] ?? fileUrl
        : new URL(fileUrl, apiBase).pathname;
    } catch {
      setFileError('Invalid document URL');
      return;
    }
    if (!/^\/uploads\/[^/]+$/.test(pathname) || pathname.includes('..')) {
      setFileError('Invalid document URL');
      return;
    }
    const res = await fetch(`${apiBase}${pathname}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      setFileError('Unable to open result file');
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setFileError('');
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch(`${apiBase}/uploads/patient-documents`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }
      const uploaded = (await uploadRes.json()) as { url: string };
      setResultFileUrl(uploaded.url);
      setResultFileName(file.name);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Upload failed');
      setResultFileUrl(null);
      setResultFileName('');
    } finally {
      setUploading(false);
    }
  };

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
            resultFileUrl: resultFileUrl || undefined,
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

  const selectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setResultValue('');
    setReferenceRange('');
    setUnit('');
    setResultFileUrl(null);
    setResultFileName('');
    setFileError('');
  };

  return (
    <div>
      <DashboardHeader title="Lab Queue" subtitle="Manage lab orders and enter results" />

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">{error}</p>
      ) : null}

      {fileError ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">{fileError}</p>
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
            {patientsError ? (
              <QueryError
                message="We could not search patients. Please try again."
                onRetry={() => void refetchPatients()}
                className="text-left"
              />
            ) : patientsData?.patients?.items?.length ? (
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
            <p className="text-sm text-clay-text-muted">
              {listError ? '—' : `${pendingOrders.length} pending`}
            </p>
          </div>
          {loading ? (
            <p className="px-6 py-8 text-center text-clay-text-muted">Loading orders...</p>
          ) : listError ? (
            <div className="px-6 py-8">
              <QueryError
                message="We could not load lab orders. Please try again."
                onRetry={() => void refetch()}
              />
            </div>
          ) : orders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FlaskConical className="mx-auto mb-3 h-10 w-10 text-clay-text-muted/50" />
              <p className="text-clay-text-muted">No lab orders in queue.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/30">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`flex w-full items-center gap-4 px-6 py-4 transition hover:bg-clay-primary-light/20 ${
                    selectedOrderId === order.id ? 'bg-clay-primary-light/40' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectOrder(order.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-medium text-clay-text">{order.testName}</p>
                    <p className="text-sm text-clay-text-muted">
                      {order.patient?.fullName ?? 'Unknown'} ·{' '}
                      {new Date(order.createdAt).toLocaleString()}
                      {order.result?.resultValue ? ` · ${order.result.resultValue}` : ''}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {order.status === 'completed' && order.result?.resultFileUrl ? (
                      <button
                        type="button"
                        onClick={() => void handleOpenResultFile(order.result!.resultFileUrl!)}
                        className="inline-flex items-center gap-1 rounded-xl bg-clay-primary-light/50 px-2 py-1 text-xs font-medium text-clay-primary hover:bg-clay-primary-light"
                        title="Download result file"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        File
                      </button>
                    ) : null}
                    {canWriteLab &&
                    !['completed', 'cancelled'].includes(order.status) ? (
                      <ClayButton
                        size="sm"
                        variant="danger"
                        isLoading={updatingStatus}
                        onClick={() => {
                          if (
                            !confirm(
                              'Cancel this lab order? This cannot be undone from the queue.',
                            )
                          ) {
                            return;
                          }
                          void handleAdvanceStatus(order.id, 'cancelled').then(
                            (ok) => {
                              if (ok && selectedOrderId === order.id) {
                                setSelectedOrderId(null);
                              }
                            },
                          );
                        }}
                      >
                        Cancel
                      </ClayButton>
                    ) : null}
                    {canWriteLab && nextLabStatus(order.status) ? (
                      <ClayButton
                        size="sm"
                        variant="secondary"
                        isLoading={updatingStatus}
                        onClick={() => {
                          const next = nextLabStatus(order.status);
                          if (next) void handleAdvanceStatus(order.id, next.status);
                        }}
                      >
                        {nextLabStatus(order.status)?.label}
                      </ClayButton>
                    ) : null}
                    <ClayBadge variant={statusVariant(order.status)}>
                      {order.status}
                    </ClayBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ClayCard>

        {canWriteLab ? (
          <ClayCard>
            <h2 className="mb-4 text-lg font-semibold text-clay-text">Enter Result</h2>
            {selectedOrderId ? (
              <form onSubmit={handleComplete} className="space-y-4">
                <p className="text-sm text-clay-text-muted">
                  Order ID: <span className="font-mono text-clay-text">{selectedOrderId}</span>
                </p>
                {(() => {
                  const selected = orders.find((o) => o.id === selectedOrderId);
                  const next = selected ? nextLabStatus(selected.status) : null;
                  if (!selected || !next) return null;
                  return (
                    <p className="rounded-2xl bg-clay-primary-light/40 px-3 py-2 text-xs text-clay-text-muted">
                      Status is still &ldquo;{selected.status}&rdquo;. You can{' '}
                      <button
                        type="button"
                        className="font-medium text-clay-primary hover:underline"
                        disabled={updatingStatus}
                        onClick={() => void handleAdvanceStatus(selectedOrderId, next.status)}
                      >
                        {next.label.toLowerCase()}
                      </button>{' '}
                      before completing, or complete now if ready.
                    </p>
                  );
                })()}
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
                <div>
                  <p className="mb-2 text-sm font-medium text-clay-text">Result File (optional)</p>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-clay-surface px-4 py-2 text-sm font-medium text-clay-primary shadow-clay-sm hover:shadow-clay">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : resultFileName || 'Upload file'}
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFileUpload(file);
                      }}
                    />
                  </label>
                  {resultFileName ? (
                    <p className="mt-2 text-xs text-clay-text-muted">{resultFileName} attached</p>
                  ) : null}
                </div>
                <ClayButton type="submit" isLoading={completing || uploading}>
                  Complete & Save Result
                </ClayButton>
              </form>
            ) : (
              <p className="text-sm text-clay-text-muted">
                Select an order from the queue to enter results.
              </p>
            )}
          </ClayCard>
        ) : null}
      </div>
    </div>
  );
}
