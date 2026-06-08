import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/40 bg-clay-surface/50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-clay-primary text-sm font-bold text-white">
                CC
              </div>
              <span className="font-bold text-clay-text">CareConnect</span>
            </div>
            <p className="text-sm text-clay-text-muted">
              Open-source hospital management for modern healthcare teams.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-clay-text">Product</h4>
            <ul className="space-y-2 text-sm text-clay-text-muted">
              <li><Link href="/#features" className="hover:text-clay-primary">Features</Link></li>
              <li><Link href="/#pricing" className="hover:text-clay-primary">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-clay-text">Resources</h4>
            <ul className="space-y-2 text-sm text-clay-text-muted">
              <li><a href="https://github.com/Karthikkk-24/CareConnect" className="hover:text-clay-primary">GitHub</a></li>
              <li><Link href="/docs" className="hover:text-clay-primary">Documentation</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-clay-text">Legal</h4>
            <ul className="space-y-2 text-sm text-clay-text-muted">
              <li><Link href="/privacy" className="hover:text-clay-primary">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-clay-primary">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-white/40 pt-8 text-center text-sm text-clay-text-muted">
          © {new Date().getFullYear()} CareConnect. Open source under MIT License.
        </div>
      </div>
    </footer>
  );
}
