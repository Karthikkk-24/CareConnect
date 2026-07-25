/**
 * Fetch an authenticated upload and open it in a new tab via blob URL.
 */
export async function openAuthenticatedUpload(
  fileUrl: string,
  getToken: () => Promise<string | null>,
): Promise<void> {
  const token = await getToken();
  const res = await fetch(fileUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(res.status === 403 ? 'Access denied' : 'Failed to download file');
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
  if (!opened) {
    // Popup blocked — fall back to download via anchor
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = '';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  // Revoke after the browser has a chance to load
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
