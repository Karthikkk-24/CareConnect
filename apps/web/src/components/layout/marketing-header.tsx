'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ClayButton } from '@careconnect/ui';

export function MarketingHeader() {
  const t = useTranslations('marketing');
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-clay-bg/80 backdrop-blur-md">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-clay-surface focus:px-4 focus:py-2 focus:shadow-clay-sm"
      >
        {t('skipToContent')}
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-primary-light to-clay-primary text-lg font-bold text-white shadow-clay-sm">
            CC
          </div>
          <span className="text-xl font-bold text-clay-text">CareConnect</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Marketing">
          <Link href="/#features" className="text-sm font-medium text-clay-text-muted hover:text-clay-primary">
            {t('features')}
          </Link>
          <Link href="/#how-it-works" className="text-sm font-medium text-clay-text-muted hover:text-clay-primary">
            {t('howItWorks')}
          </Link>
          <Link href="/#pricing" className="text-sm font-medium text-clay-text-muted hover:text-clay-primary">
            {t('pricing')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:block">
            <ClayButton variant="ghost" size="sm">
              {t('logIn')}
            </ClayButton>
          </Link>
          <Link href="/register" className="hidden sm:block">
            <ClayButton size="sm">{t('getStarted')}</ClayButton>
          </Link>
          <button
            type="button"
            className="rounded-2xl p-2 text-clay-text md:hidden"
            aria-expanded={open}
            aria-label={t('menu')}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          className="border-t border-white/40 px-6 py-4 md:hidden"
          aria-label="Mobile marketing"
        >
          <div className="flex flex-col gap-3">
            <Link
              href="/#features"
              className="text-sm font-medium text-clay-text"
              onClick={() => setOpen(false)}
            >
              {t('features')}
            </Link>
            <Link
              href="/#how-it-works"
              className="text-sm font-medium text-clay-text"
              onClick={() => setOpen(false)}
            >
              {t('howItWorks')}
            </Link>
            <Link
              href="/#pricing"
              className="text-sm font-medium text-clay-text"
              onClick={() => setOpen(false)}
            >
              {t('pricing')}
            </Link>
            <Link href="/login" onClick={() => setOpen(false)}>
              <ClayButton variant="ghost" size="sm" className="w-full">
                {t('logIn')}
              </ClayButton>
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              <ClayButton size="sm" className="w-full">
                {t('getStarted')}
              </ClayButton>
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
