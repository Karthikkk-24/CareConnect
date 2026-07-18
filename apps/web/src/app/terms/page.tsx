import { MarketingFooter } from '@/components/layout/marketing-footer';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { ClayCard } from '@careconnect/ui';

export default function TermsPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <ClayCard>
          <h1 className="mb-4 text-3xl font-bold text-clay-text">Terms of Use</h1>
          <p className="text-sm leading-relaxed text-clay-text-muted">
            CareConnect is provided as open-source software under the MIT License, without warranty.
            You are responsible for securing your deployment, configuring authentication correctly,
            and complying with local healthcare regulations when handling patient information.
          </p>
        </ClayCard>
      </main>
      <MarketingFooter />
    </>
  );
}
