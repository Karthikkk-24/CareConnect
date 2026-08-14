import { BadRequestException } from '@nestjs/common';
import { fromFile } from 'file-type';
import { promises as fs } from 'fs';
import { basename, dirname, extname, join } from 'path';

/** MIME → allowed extension (server-chosen; never trust client extension alone). */
export const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'text/plain': '.txt',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
};

export const EXT_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_TO_EXT).map(([mime, ext]) => [ext, mime]),
);

/** Preview-safe types may be inline; everything else downloads as attachment. */
export const INLINE_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
]);

/**
 * file-type reports OLE Compound File Binary as application/x-cfb, not
 * application/msword. Canonicalize so .doc uploads still match the allowlist.
 */
const SNIFF_MIME_ALIASES: Record<string, string> = {
  'application/x-cfb': 'application/msword',
};

async function unlinkQuiet(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // already removed
  }
}

/** Reject unknown binaries claimed as text/plain (NUL in the first 8KiB). */
async function looksLikeText(filePath: string): Promise<boolean> {
  const handle = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(8192);
    const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
    if (bytesRead === 0) return true;
    return !buf.subarray(0, bytesRead).includes(0);
  } finally {
    await handle.close();
  }
}

/**
 * Sniff magic bytes after multer writes the file. Unlink and reject when the
 * real type is missing, not allowlisted, or does not match the claimed MIME.
 */
export async function sniffAndValidateUpload(
  filePath: string,
  claimedMime: string,
): Promise<{ mime: string; ext: string }> {
  let detectedMime: string | undefined;
  try {
    const detected = await fromFile(filePath);
    detectedMime = detected?.mime;
  } catch {
    // Truncated / unreadable magic — treat as undetected.
    detectedMime = undefined;
  }

  if (detectedMime && SNIFF_MIME_ALIASES[detectedMime]) {
    detectedMime = SNIFF_MIME_ALIASES[detectedMime];
  }

  if (
    !detectedMime &&
    claimedMime === 'text/plain' &&
    (await looksLikeText(filePath))
  ) {
    detectedMime = 'text/plain';
  }

  const ext = detectedMime ? MIME_TO_EXT[detectedMime] : undefined;
  if (!detectedMime || !ext) {
    await unlinkQuiet(filePath);
    throw new BadRequestException(
      detectedMime
        ? `Unsupported file type: ${detectedMime}`
        : 'Could not determine file type from content',
    );
  }

  if (claimedMime !== detectedMime) {
    await unlinkQuiet(filePath);
    throw new BadRequestException(
      `File content type ${detectedMime} does not match claimed type ${claimedMime}`,
    );
  }

  return { mime: detectedMime, ext };
}

/** Rename the stored file so its extension matches the sniffed MIME. */
export async function ensureStoredExtension(
  filePath: string,
  desiredExt: string,
): Promise<string> {
  const currentExt = extname(filePath).toLowerCase();
  const name = basename(filePath);
  if (currentExt === desiredExt) return name;

  const newName = `${name.slice(0, name.length - currentExt.length)}${desiredExt}`;
  await fs.rename(filePath, join(dirname(filePath), newName));
  return newName;
}
