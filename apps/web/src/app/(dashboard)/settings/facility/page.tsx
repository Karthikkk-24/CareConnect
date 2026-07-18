'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { BedDouble, Building, DoorClosed, Layers, Plus } from 'lucide-react';
import { ClayBadge, ClayButton, ClayCard, ClayInput } from '@careconnect/ui';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import {
  BEDS_QUERY,
  CREATE_BED_MUTATION,
  CREATE_DEPARTMENT_MUTATION,
  CREATE_WARD_MUTATION,
  DEPARTMENTS_QUERY,
  ME_QUERY,
  WARDS_QUERY,
} from '@/lib/graphql/queries';

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface Ward {
  id: string;
  name: string;
  floor?: string;
  departmentId?: string;
}

interface Bed {
  id: string;
  label: string;
  status: string;
  wardId: string;
}

export default function FacilitySettingsPage() {
  const { data: meData } = useQuery(ME_QUERY);
  const hospitalId = meData?.me?.hospitalId;

  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [wardName, setWardName] = useState('');
  const [wardFloor, setWardFloor] = useState('');
  const [wardDeptId, setWardDeptId] = useState('');
  const [bedLabel, setBedLabel] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const departmentsQuery = useQuery(DEPARTMENTS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });
  const wardsQuery = useQuery(WARDS_QUERY, {
    variables: { hospitalId },
    skip: !hospitalId,
  });
  const bedsQuery = useQuery(BEDS_QUERY, {
    variables: { hospitalId, wardId: selectedWardId ?? undefined },
    skip: !hospitalId,
  });

  const [createDepartment, { loading: creatingDept }] = useMutation(
    CREATE_DEPARTMENT_MUTATION,
    {
      onCompleted: () => {
        setMessage('Department created');
        setDeptName('');
        setDeptDesc('');
        departmentsQuery.refetch();
      },
      onError: (err) => setError(err.message),
    },
  );

  const [createWard, { loading: creatingWard }] = useMutation(CREATE_WARD_MUTATION, {
    onCompleted: () => {
      setMessage('Ward created');
      setWardName('');
      setWardFloor('');
      setWardDeptId('');
      wardsQuery.refetch();
    },
    onError: (err) => setError(err.message),
  });

  const [createBed, { loading: creatingBed }] = useMutation(CREATE_BED_MUTATION, {
    onCompleted: () => {
      setMessage('Bed created');
      setBedLabel('');
      bedsQuery.refetch();
    },
    onError: (err) => setError(err.message),
  });

  const departments: Department[] = departmentsQuery.data?.departments ?? [];
  const wards: Ward[] = wardsQuery.data?.wards ?? [];
  const beds: Bed[] = bedsQuery.data?.beds ?? [];
  const visibleBeds = selectedWardId ? beds.filter((b) => b.wardId === selectedWardId) : beds;

  const resetFlash = () => {
    setMessage('');
    setError('');
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFlash();
    if (!deptName.trim()) {
      setError('Department name is required');
      return;
    }
    await createDepartment({
      variables: {
        hospitalId,
        input: { name: deptName.trim(), description: deptDesc.trim() || undefined },
      },
    });
  };

  const handleCreateWard = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFlash();
    if (!wardName.trim()) {
      setError('Ward name is required');
      return;
    }
    await createWard({
      variables: {
        hospitalId,
        input: {
          name: wardName.trim(),
          floor: wardFloor.trim() || undefined,
          departmentId: wardDeptId || undefined,
        },
      },
    });
  };

  const handleCreateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFlash();
    if (!selectedWardId) {
      setError('Select a ward to add beds to');
      return;
    }
    if (!bedLabel.trim()) {
      setError('Bed label is required');
      return;
    }
    await createBed({
      variables: {
        hospitalId,
        input: { wardId: selectedWardId, label: bedLabel.trim() },
      },
    });
  };

  if (!hospitalId) {
    return (
      <div>
        <DashboardHeader title="Facility Setup" subtitle="Departments, wards, and beds" />
        <p className="text-clay-text-muted">No hospital linked to your account yet.</p>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader
        title="Facility Setup"
        subtitle="Configure departments, wards, and beds"
      />

      <p className="mb-6 text-sm text-clay-text-muted">
        <Link href="/settings" className="text-clay-primary hover:underline">
          ← Back to Settings
        </Link>
      </p>

      {message ? (
        <p className="mb-4 rounded-2xl bg-clay-success/10 px-4 py-2 text-sm text-clay-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-clay-error">{error}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <ClayCard>
          <div className="mb-4 flex items-center gap-2">
            <Building className="h-5 w-5 text-clay-primary" />
            <h2 className="text-lg font-semibold text-clay-text">Departments</h2>
          </div>

          <form onSubmit={handleCreateDept} className="mb-4 space-y-3">
            <ClayInput
              label="Name *"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Cardiology"
              required
            />
            <ClayInput
              label="Description"
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
              placeholder="Optional summary"
            />
            <ClayButton type="submit" size="sm" isLoading={creatingDept}>
              <Plus className="h-4 w-4" />
              Add Department
            </ClayButton>
          </form>

          <div className="space-y-2">
            {departmentsQuery.loading ? (
              <p className="text-sm text-clay-text-muted">Loading...</p>
            ) : departments.length === 0 ? (
              <p className="text-sm text-clay-text-muted">No departments yet.</p>
            ) : (
              departments.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl bg-clay-primary-light/20 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-clay-text">{d.name}</p>
                  {d.description ? (
                    <p className="text-xs text-clay-text-muted">{d.description}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </ClayCard>

        <ClayCard>
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-clay-primary" />
            <h2 className="text-lg font-semibold text-clay-text">Wards</h2>
          </div>

          <form onSubmit={handleCreateWard} className="mb-4 space-y-3">
            <ClayInput
              label="Name *"
              value={wardName}
              onChange={(e) => setWardName(e.target.value)}
              placeholder="e.g. General Ward A"
              required
            />
            <ClayInput
              label="Floor"
              value={wardFloor}
              onChange={(e) => setWardFloor(e.target.value)}
              placeholder="e.g. 2"
            />
            <div className="flex flex-col gap-2">
              <label htmlFor="ward-dept" className="text-sm font-medium text-clay-text">
                Department (optional)
              </label>
              <select
                id="ward-dept"
                value={wardDeptId}
                onChange={(e) => setWardDeptId(e.target.value)}
                className="w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-sm text-clay-text shadow-clay-inset outline-none focus:ring-2 focus:ring-clay-primary/30"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <ClayButton type="submit" size="sm" isLoading={creatingWard}>
              <Plus className="h-4 w-4" />
              Add Ward
            </ClayButton>
          </form>

          <div className="space-y-2">
            {wardsQuery.loading ? (
              <p className="text-sm text-clay-text-muted">Loading...</p>
            ) : wards.length === 0 ? (
              <p className="text-sm text-clay-text-muted">No wards yet.</p>
            ) : (
              wards.map((w) => {
                const isActive = selectedWardId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWardId(isActive ? null : w.id)}
                    className={`block w-full rounded-2xl px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? 'bg-clay-primary-light text-clay-primary shadow-clay-inset'
                        : 'bg-clay-primary-light/20 text-clay-text hover:bg-clay-primary-light/40'
                    }`}
                  >
                    <p className="font-medium">{w.name}</p>
                    {w.floor ? (
                      <p className="text-xs text-clay-text-muted">Floor {w.floor}</p>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </ClayCard>

        <ClayCard>
          <div className="mb-4 flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-clay-primary" />
            <h2 className="text-lg font-semibold text-clay-text">Beds</h2>
          </div>

          {selectedWardId ? (
            <form onSubmit={handleCreateBed} className="mb-4 space-y-3">
              <ClayInput
                label="Label *"
                value={bedLabel}
                onChange={(e) => setBedLabel(e.target.value)}
                placeholder="e.g. Bed 1"
                required
              />
              <ClayButton type="submit" size="sm" isLoading={creatingBed}>
                <Plus className="h-4 w-4" />
                Add Bed
              </ClayButton>
            </form>
          ) : (
            <p className="mb-4 rounded-2xl bg-clay-primary-light/20 px-3 py-2 text-sm text-clay-text-muted">
              <DoorClosed className="mr-1 inline-block h-4 w-4 align-text-bottom" />
              Select a ward to manage its beds.
            </p>
          )}

          <div className="space-y-2">
            {bedsQuery.loading ? (
              <p className="text-sm text-clay-text-muted">Loading...</p>
            ) : visibleBeds.length === 0 ? (
              <p className="text-sm text-clay-text-muted">
                {selectedWardId
                  ? 'No beds in this ward yet.'
                  : 'No beds configured yet.'}
              </p>
            ) : (
              visibleBeds.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-2xl bg-clay-primary-light/20 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-clay-text">{b.label}</span>
                  <ClayBadge
                    variant={
                      b.status === 'available'
                        ? 'success'
                        : b.status === 'occupied'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {b.status}
                  </ClayBadge>
                </div>
              ))
            )}
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
