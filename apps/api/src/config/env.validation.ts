export function validateEnv(config: Record<string, unknown>) {
  const missing: string[] = [];

  if (!config.DATABASE_URL || typeof config.DATABASE_URL !== 'string' || !config.DATABASE_URL.trim()) {
    missing.push('DATABASE_URL');
  }

  if (
    !config.CLERK_SECRET_KEY ||
    typeof config.CLERK_SECRET_KEY !== 'string' ||
    !config.CLERK_SECRET_KEY.trim()
  ) {
    missing.push('CLERK_SECRET_KEY');
  }

  if (
    !config.CLERK_ISSUER ||
    typeof config.CLERK_ISSUER !== 'string' ||
    !config.CLERK_ISSUER.trim()
  ) {
    missing.push('CLERK_ISSUER');
  }

  if (missing.length > 0) {
    throw new Error(
      [
        `Missing required environment variables: ${missing.join(', ')}`,
        '',
        'Setup steps:',
        '  1. cp apps/api/.env.example apps/api/.env',
        '  2. Copy the DATABASE_URL from Neon Dashboard → Connection string',
        '  3. Copy CLERK_SECRET_KEY from Clerk Dashboard → API Keys',
        '  4. Copy CLERK_ISSUER (Frontend API URL) from Clerk Dashboard → API Keys',
        '',
        'Example values:',
        '  DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require',
        '  CLERK_SECRET_KEY=sk_test_...',
        '  CLERK_ISSUER=https://your-app.clerk.accounts.dev',
      ].join('\n'),
    );
  }

  const databaseUrl = config.DATABASE_URL as string;
  if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
    throw new Error(
      'DATABASE_URL must start with postgres:// or postgresql://. Check your Neon connection string.',
    );
  }

  if (
    databaseUrl.includes('REPLACE_WITH') ||
    databaseUrl.includes('YOUR-PASSWORD') ||
    databaseUrl.includes('YOUR_NEON')
  ) {
    throw new Error(
      'DATABASE_URL still contains placeholder values. Replace it with your real Neon connection string from the Neon Dashboard.',
    );
  }

  const clerkSecret = config.CLERK_SECRET_KEY as string;
  if (clerkSecret.includes('REPLACE_WITH')) {
    throw new Error(
      'CLERK_SECRET_KEY still contains a placeholder. Copy the real key from Clerk Dashboard → API Keys.',
    );
  }

  const clerkIssuer = config.CLERK_ISSUER as string;
  if (clerkIssuer.includes('REPLACE_WITH') || !clerkIssuer.startsWith('https://')) {
    throw new Error(
      'CLERK_ISSUER must be an https URL like https://your-app.clerk.accounts.dev (from Clerk Dashboard → API Keys → Frontend API).',
    );
  }

  return config;
}
