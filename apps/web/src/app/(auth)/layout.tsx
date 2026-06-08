import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-clay-bg px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-primary-light to-clay-primary text-lg font-bold text-white shadow-clay-sm">
          CC
        </div>
        <span className="text-2xl font-bold text-clay-text">CareConnect</span>
      </Link>
      {children}
    </div>
  );
}
