export function getPublicApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error('NEXT_PUBLIC_API_URL is required');
  return url;
}

export function getApiOrigin(): string {
  return getPublicApiUrl().replace(/\/graphql\/?$/, '');
}
