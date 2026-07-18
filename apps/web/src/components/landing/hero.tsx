import Link from 'next/link';
import { ClayButton, ClayCard } from '@careconnect/ui';
import { Activity, Heart, Shield } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-20">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-clay-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-clay-primary-light blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-clay-primary-light px-4 py-2 text-sm font-medium text-clay-primary shadow-clay-inset">
            <Heart className="h-4 w-4" />
            Open Source Healthcare Platform
          </span>
          <h1 className="text-4xl font-bold leading-tight text-clay-text md:text-5xl lg:text-6xl">
            Modern hospital management,{' '}
            <span className="text-clay-primary">beautifully simple</span>
          </h1>
          <p className="max-w-xl text-lg text-clay-text-muted">
            CareConnect helps hospitals manage patients, appointments, admissions, billing, and
            clinical workflows in one place — self-hosted on Neon with Clerk authentication.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/register">
              <ClayButton size="lg">Get started</ClayButton>
            </Link>
            <Link href="/#features">
              <ClayButton variant="secondary" size="lg">
                Explore Features
              </ClayButton>
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 pt-4 text-sm text-clay-text-muted">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-clay-primary" /> Role-based access control
            </span>
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-clay-primary" /> Live hospital dashboards
            </span>
          </div>
        </div>

        <ClayCard padding="lg" className="relative">
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-clay-primary-light p-4 shadow-clay-inset">
              <p className="text-2xl font-bold text-clay-primary">Patients</p>
              <p className="text-sm text-clay-text-muted">Registration & charts</p>
            </div>
            <div className="rounded-2xl bg-clay-primary-light p-4 shadow-clay-inset">
              <p className="text-2xl font-bold text-clay-primary">Clinical</p>
              <p className="text-sm text-clay-text-muted">Notes, labs & Rx</p>
            </div>
            <div className="rounded-2xl bg-clay-primary-light p-4 shadow-clay-inset">
              <p className="text-2xl font-bold text-clay-primary">Billing</p>
              <p className="text-sm text-clay-text-muted">Invoices & payments</p>
            </div>
            <div className="rounded-2xl bg-clay-primary-light p-4 shadow-clay-inset">
              <p className="text-2xl font-bold text-clay-primary">Portal</p>
              <p className="text-sm text-clay-text-muted">Patient self-serve</p>
            </div>
          </div>
          <p className="text-center text-sm text-clay-text-muted">
            Built for clinics and hospitals that want full control of their data
          </p>
        </ClayCard>
      </div>
    </section>
  );
}
