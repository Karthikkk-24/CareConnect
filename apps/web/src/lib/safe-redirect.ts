/**
 * Validate post-auth redirect targets to prevent open redirects.
 * Only same-origin relative paths are allowed (no protocol-relative //evil).
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return fallback;
  if (trimmed.includes('://') || trimmed.includes('\\')) return fallback;
  // Block encoded tricks like /%2F%2Fevil.com
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.startsWith('//') || decoded.includes('://')) return fallback;
  } catch {
    return fallback;
  }
  return trimmed;
}
