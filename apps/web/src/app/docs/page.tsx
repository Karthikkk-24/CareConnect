import { MarketingFooter } from '@/components/layout/marketing-footer';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { ClayCard } from '@careconnect/ui';

export default function DocsPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <ClayCard>
          <h1 className="mb-4 text-3xl font-bold text-clay-text">Documentation</h1>
          <p className="mb-4 text-clay-text-muted">
            CareConnect is an open-source hospital management platform. Use this guide to get
            started locally.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-clay-text">
            <li>Copy environment files with <code>pnpm setup:env</code></li>
            <li>Set Supabase credentials in <code>apps/api/.env</code> and <code>apps/web/.env.local</code></li>
            <li>Apply migrations with <code>supabase db push</code></li>
            <li>Run <code>pnpm --filter @careconnect/types build && pnpm dev</code></li>
          </ol>
          <p className="mt-6 text-sm text-clay-text-muted">
            Full API docs live at <code>http://localhost:4000/graphql</code> when the API is running.
          </p>
        </ClayCard>
      </main>
      <MarketingFooter />
    </>
  );
}
