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
            CareConnect streamlines patient records, appointments, billing, and clinical
            workflows — built for hospitals that demand excellence.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/register">
              <ClayButton size="lg">Start Free Trial</ClayButton>
            </Link>
            <Link href="/#features">
              <ClayButton variant="secondary" size="lg">
                Explore Features
              </ClayButton>
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 pt-4 text-sm text-clay-text-muted">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-clay-primary" /> HIPAA-ready architecture
            </span>
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-clay-primary" /> Real-time dashboards
            </span>
          </div>
        </div>

        <ClayCard padding="lg" className="relative">
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-clay-primary-light p-4 shadow-clay-inset">
              <p className="text-2xl font-bold text-clay-primary">2,400+</p>
              <p className="text-sm text-clay-text-muted">Patients managed</p>
            </div>
            <div className="rounded-2xl bg-clay-primary-light p-4 shadow-clay-inset">
              <p className="text-2xl font-bold text-clay-primary">98.5%</p>
              <p className="text-sm text-clay-text-muted">Uptime SLA</p>
            </div>
            <div className="rounded-2xl bg-clay-primary-light p-4 shadow-clay-inset">
              <p className="text-2xl font-bold text-clay-primary">150+</p>
              <p className="text-sm text-clay-text-muted">Hospitals onboarded</p>
            </div>
            <div className="rounded-2xl bg-clay-primary-light p-4 shadow-clay-inset">
              <p className="text-2xl font-bold text-clay-primary">24/7</p>
              <p className="text-sm text-clay-text-muted">Support available</p>
            </div>
          </div>
          <p className="text-center text-sm text-clay-text-muted">
            Trusted by healthcare teams worldwide
          </p>
        </ClayCard>
      </div>
    </section>
  );
}
