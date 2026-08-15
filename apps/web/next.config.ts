import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';

// Clerk hydrates via inline scripts (SSR state + cache signals) and loads
// clerk-js from its Frontend API, so script-src must keep 'unsafe-inline'
// and the Clerk domains. Tighten with nonces once verified against a live
// Clerk instance. `data:`/`blob:` in img-src covers inline images and
// blob object URLs used to render uploaded documents.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com`,
  `style-src 'self' 'unsafe-inline'`,
  `connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com images.clerk.dev ${API_URL}`,
  `img-src 'self' data: blob: https://img.clerk.com`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.clerk.accounts.dev https://*.clerk.com",
  "frame-ancestors 'self'",
  // Note: no `upgrade-insecure-requests` — it would rewrite local HTTP API
  // fetches (http://localhost:4000) to https in development. HSTS (below)
  // pins HTTPS in production instead.
].join('; ');

// Baseline security headers on every response (#263). HSTS is only attached
// to HTTPS requests (via x-forwarded-proto) so local http:// development is
// not poisoned.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@careconnect/ui', '@careconnect/types'],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/:path*',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'https' }],
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
