import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-clay-bg px-6 py-12">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50 focus:rounded-xl focus:bg-clay-surface focus:px-4 focus:py-2 focus:shadow-clay-sm"
      >
        Skip to main content
      </a>
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-primary-light to-clay-primary text-lg font-bold text-white shadow-clay-sm">
          CC
        </div>
        <span className="text-2xl font-bold text-clay-text">CareConnect</span>
      </Link>
      <main id="auth-main" className="w-full max-w-md outline-none" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
