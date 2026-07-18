import Link from 'next/link';
import { MarketingFooter } from '@/components/layout/marketing-footer';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { ClayCard } from '@careconnect/ui';

export default function DocsPage() {
  return (
    <>
      <MarketingHeader />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
        <ClayCard>
          <h1 className="mb-4 text-3xl font-bold text-clay-text">Documentation</h1>
          <p className="mb-6 text-clay-text-muted">
            CareConnect is an open-source hospital management platform built with Next.js, NestJS
            GraphQL, Neon Postgres, and Clerk.
          </p>

          <h2 className="mb-2 text-lg font-semibold text-clay-text">Product areas</h2>
          <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-clay-text">
            <li>Staff roles, patients, appointments, admissions, and discharge follow-ups</li>
            <li>Clinical charting: vitals, notes, diagnoses, prescriptions, and lab orders</li>
            <li>Facility setup (departments, wards, beds), pharmacy, inventory, and billing</li>
            <li>Patient portal for linked accounts (read-only records and appointments)</li>
          </ul>

          <h2 className="mb-2 text-lg font-semibold text-clay-text">Local setup</h2>
          <ol className="mb-6 list-decimal space-y-2 pl-5 text-sm text-clay-text">
            <li>
              Copy environment files with <code>pnpm setup:env</code>
            </li>
            <li>
              Set <code>DATABASE_URL</code> (Neon), <code>DATABASE_SSL=true</code>,{' '}
              <code>CLERK_SECRET_KEY</code>, and <code>CLERK_ISSUER</code> in{' '}
              <code>apps/api/.env</code>
            </li>
            <li>
              Optionally set <code>CORS_ORIGIN</code> and <code>API_PUBLIC_URL</code> for your web
              and API hosts
            </li>
            <li>
              Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and <code>CLERK_SECRET_KEY</code> in{' '}
              <code>apps/web/.env.local</code>
            </li>
            <li>Apply SQL migrations under <code>supabase/migrations/</code> to Neon</li>
            <li>
              Run <code>pnpm --filter @careconnect/types build && pnpm dev</code>
            </li>
          </ol>

          <h2 className="mb-2 text-lg font-semibold text-clay-text">References</h2>
          <ul className="space-y-2 text-sm text-clay-text">
            <li>
              GraphQL playground:{' '}
              <code className="text-clay-text-muted">http://localhost:4000/graphql</code>
            </li>
            <li>
              Repo docs:{' '}
              <Link href="https://github.com/Karthikkk-24/CareConnect" className="text-clay-primary hover:underline">
                GitHub README &amp; CONTRIBUTING
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-clay-primary hover:underline">
                Privacy
              </Link>
              {' · '}
              <Link href="/terms" className="text-clay-primary hover:underline">
                Terms
              </Link>
            </li>
          </ul>
        </ClayCard>
      </main>
      <MarketingFooter />
    </>
  );
}
