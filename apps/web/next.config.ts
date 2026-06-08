import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@careconnect/ui', '@careconnect/types'],
};

export default nextConfig;
