import Link from 'next/link';
import { ClayButton, ClayCard } from '@careconnect/ui';

export function CTA() {
  return (
    <section className="px-6 py-20">
      <ClayCard padding="lg" className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-clay-text">
          Ready to transform your hospital?
        </h2>
        <p className="mb-8 text-clay-text-muted">
          Join healthcare teams using CareConnect to deliver better patient care.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/register">
            <ClayButton size="lg">Create Free Account</ClayButton>
          </Link>
          <Link href="/login">
            <ClayButton variant="secondary" size="lg">
              Sign In
            </ClayButton>
          </Link>
        </div>
      </ClayCard>
    </section>
  );
}
