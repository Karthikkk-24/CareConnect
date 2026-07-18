export function validateEnv(config: Record<string, unknown>) {
  const missing: string[] = [];

  if (!config.DATABASE_URL || typeof config.DATABASE_URL !== 'string' || !config.DATABASE_URL.trim()) {
    missing.push('DATABASE_URL');
  }

  if (
    !config.SUPABASE_JWT_SECRET ||
    typeof config.SUPABASE_JWT_SECRET !== 'string' ||
    !config.SUPABASE_JWT_SECRET.trim()
  ) {
    missing.push('SUPABASE_JWT_SECRET');
  }

  // SUPABASE_URL + SERVICE_ROLE_KEY recommended for staff invites (validated as optional)

  if (missing.length > 0) {
    throw new Error(
      [
        `Missing required environment variables: ${missing.join(', ')}`,
        '',
        'Setup steps:',
        '  1. cp apps/api/.env.example apps/api/.env',
        '  2. Open Supabase Dashboard → Settings → Database',
        '  3. Copy the URI connection string into DATABASE_URL',
        '  4. Copy JWT Secret from Settings → API into SUPABASE_JWT_SECRET',
        '',
        'Example DATABASE_URL:',
        '  postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres',
      ].join('\n'),
    );
  }

  const databaseUrl = config.DATABASE_URL as string;
  if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
    throw new Error(
      'DATABASE_URL must start with postgres:// or postgresql://. Check your Supabase connection string.',
    );
  }

  if (
    databaseUrl.includes('REPLACE_WITH') ||
    databaseUrl.includes('[') ||
    databaseUrl.includes('YOUR-PASSWORD')
  ) {
    throw new Error(
      'DATABASE_URL still contains placeholder values. Replace it with your real Supabase connection string from Dashboard → Settings → Database.',
    );
  }

  const jwtSecret = config.SUPABASE_JWT_SECRET as string;
  if (jwtSecret.includes('REPLACE_WITH') || jwtSecret.includes('your-supabase-jwt-secret')) {
    throw new Error(
      'SUPABASE_JWT_SECRET still contains a placeholder. Copy the real JWT Secret from Supabase Dashboard → Settings → API.',
    );
  }

  return config;
}
