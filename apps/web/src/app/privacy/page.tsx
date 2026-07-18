import { MarketingFooter } from '@/components/layout/marketing-footer';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { ClayCard } from '@careconnect/ui';

export default function PrivacyPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <ClayCard>
          <h1 className="mb-4 text-3xl font-bold text-clay-text">Privacy Policy</h1>
          <p className="text-sm leading-relaxed text-clay-text-muted">
            CareConnect is designed with healthcare data protection in mind. Patient data is stored
            in your Supabase PostgreSQL project under your control. Access is restricted via
            role-based permissions and audit logging. Do not use this software for production PHI
            without completing your own compliance review (HIPAA/GDPR as applicable).
          </p>
        </ClayCard>
      </main>
      <MarketingFooter />
    </>
  );
}
