import { readFileSync } from 'fs';

const MAGIC_MIME: Array<{ mime: string; check: (buf: Buffer) => boolean }> = [
  {
    mime: 'application/pdf',
    check: (buf) =>
      buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === '%PDF',
  },
  {
    mime: 'image/jpeg',
    check: (buf) =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    mime: 'image/png',
    check: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47,
  },
  {
    mime: 'image/gif',
    check: (buf) =>
      buf.length >= 6 &&
      (buf.subarray(0, 6).toString('ascii') === 'GIF87a' ||
        buf.subarray(0, 6).toString('ascii') === 'GIF89a'),
  },
  {
    mime: 'image/webp',
    check: (buf) =>
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

export const UPLOAD_ALLOWED_CLIENT_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Detect MIME from file magic bytes. Returns null if unrecognized. */
export function detectMimeFromFile(filePath: string): string | null {
  const buf = readFileSync(filePath).subarray(0, 16);
  for (const entry of MAGIC_MIME) {
    if (entry.check(buf)) return entry.mime;
  }
  return null;
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case 'application/pdf':
      return '.pdf';
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '';
  }
}
