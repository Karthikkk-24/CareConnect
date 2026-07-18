import { MarketingFooter } from '@/components/layout/marketing-footer';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { ClayCard } from '@careconnect/ui';

export default function TermsPage() {
  return (
    <>
      <MarketingHeader />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
        <ClayCard>
          <h1 className="mb-4 text-3xl font-bold text-clay-text">Terms of Use</h1>
          <div className="space-y-4 text-sm leading-relaxed text-clay-text-muted">
            <p>
              CareConnect is open-source software licensed under the MIT License, provided
              &quot;as is&quot; without warranty of any kind. By using the software you accept
              these terms.
            </p>
            <p>
              <strong className="text-clay-text">Your responsibilities.</strong> You are
              responsible for securing your deployment (including Neon database access, Clerk
              authentication, and file uploads), configuring roles and permissions correctly, and
              complying with applicable healthcare privacy laws (such as HIPAA, GDPR, or local
              equivalents) when storing or processing patient information.
            </p>
            <p>
              <strong className="text-clay-text">No medical advice.</strong> CareConnect is an
              operations tool. It does not provide medical advice, diagnosis, or treatment
              recommendations. Clinical decisions remain with licensed professionals.
            </p>
            <p>
              <strong className="text-clay-text">Accounts and access.</strong> Hospital
              administrators control staff invitations and patient portal linking. Do not share
              credentials. Misuse of access to another hospital&apos;s data is prohibited.
            </p>
            <p>
              <strong className="text-clay-text">Data.</strong> Patient documents and clinical
              records you upload are stored in your configured database and upload storage. You
              retain ownership of your operational data; the software authors do not claim rights
              to your patient records.
            </p>
            <p>
              For license text, see the MIT License in the project repository. Questions about
              deployment should follow your organization&apos;s IT and compliance policies.
            </p>
          </div>
        </ClayCard>
      </main>
      <MarketingFooter />
    </>
  );
}
