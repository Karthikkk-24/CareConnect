import Link from 'next/link';
import { ClayButton } from '@careconnect/ui';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-clay-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-primary-light to-clay-primary text-lg font-bold text-white shadow-clay-sm">
            CC
          </div>
          <span className="text-xl font-bold text-clay-text">CareConnect</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/#features" className="text-sm font-medium text-clay-text-muted hover:text-clay-primary">
            Features
          </Link>
          <Link href="/#how-it-works" className="text-sm font-medium text-clay-text-muted hover:text-clay-primary">
            How it Works
          </Link>
          <Link href="/#pricing" className="text-sm font-medium text-clay-text-muted hover:text-clay-primary">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <ClayButton variant="ghost" size="sm">
              Log in
            </ClayButton>
          </Link>
          <Link href="/register">
            <ClayButton size="sm">Get Started</ClayButton>
          </Link>
        </div>
      </div>
    </header>
  );
}
