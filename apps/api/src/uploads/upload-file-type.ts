import { BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { basename, dirname, extname, join } from 'path';

const MS_WORD = 'application/msword';
const OOXML_WORD =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** MIME → allowed extension (server-chosen; never trust client extension alone). */
export const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'text/plain': '.txt',
  [MS_WORD]: '.doc',
  [OOXML_WORD]: '.docx',
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

/** OLE compound-file magic ("D0 CF 11 E0 A1 B1 1A E1"). */
const OLE_CFB_MAGIC = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);
/** CFB directory stream name for Word 97–2003 (UTF-16LE). */
const WORD_OLE_STREAM = Buffer.from('WordDocument', 'utf16le');
/** ZIP local file header magic. */
const ZIP_LOCAL_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
/** OOXML document part stored in ZIP local/central headers as plaintext. */
const DOCX_ZIP_PART = Buffer.from('word/document.xml');

/** How many leading bytes are enough to distinguish every allowlisted type. */
const SNIFF_PREFIX_BYTES = 16;

/**
 * Bounded magic-byte detection over a fixed prefix — no third-party parser,
 * so a crafted file cannot drive an unbounded parse loop (#262).
 * Containers (OLE/ZIP) are reported by container type and then
 * disambiguated by {@link canonicalizeWordContainer}.
 */
function detectFromPrefix(buf: Buffer): string | undefined {
  if (buf.length >= 5 && buf.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    return 'application/pdf';
  }
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 8 &&
    buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buf.length >= 6 &&
    (buf.subarray(0, 6).equals(Buffer.from('GIF87a')) ||
      buf.subarray(0, 6).equals(Buffer.from('GIF89a')))
  ) {
    return 'image/gif';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).equals(Buffer.from('RIFF')) &&
    buf.subarray(8, 12).equals(Buffer.from('WEBP'))
  ) {
    return 'image/webp';
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(OLE_CFB_MAGIC)) {
    return 'application/x-cfb';
  }
  if (buf.length >= 4 && buf.subarray(0, 4).equals(ZIP_LOCAL_MAGIC)) {
    return 'application/zip';
  }
  return undefined;
}

async function sniffPrefix(filePath: string): Promise<Buffer> {
  const handle = await fs.open(filePath);
  try {
    const buf = Buffer.alloc(SNIFF_PREFIX_BYTES);
    const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function unlinkQuiet(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // already removed
  }
}

async function rejectUpload(filePath: string, message: string): Promise<never> {
  await unlinkQuiet(filePath);
  throw new BadRequestException(message);
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

/** Chunked search so OLE directory / ZIP headers at EOF are still visible. */
async function containsBytes(
  filePath: string,
  needle: Buffer,
): Promise<boolean> {
  const handle = await fs.open(filePath, 'r');
  try {
    const chunk = Buffer.alloc(64 * 1024);
    let overlap = Buffer.alloc(0);
    let position = 0;
    for (;;) {
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, position);
      if (bytesRead === 0) return false;
      const window = Buffer.concat([overlap, chunk.subarray(0, bytesRead)]);
      if (window.includes(needle)) return true;
      overlap = window.subarray(Math.max(0, window.length - needle.length + 1));
      position += bytesRead;
    }
  } finally {
    await handle.close();
  }
}

/**
 * The prefix sniffer reports every OLE container as application/x-cfb and
 * every ZIP as application/zip (xls/ppt/msg/xlsx/pptx all share those
 * containers). Never blanket-alias them.
 *
 * Map to Word only when the client claimed a Word MIME *and* a Word-specific
 * marker is present. Residual risk: a polyglot that embeds WordDocument or
 * word/document.xml while also being xls/ppt/xlsx/pptx, claimed as Word.
 */
async function canonicalizeWordContainer(
  filePath: string,
  sniffed: string,
  claimed: string,
): Promise<string> {
  if (sniffed === 'application/x-cfb' || sniffed === MS_WORD) {
    if (claimed !== MS_WORD) {
      return sniffed;
    }
    if (!(await containsBytes(filePath, WORD_OLE_STREAM))) {
      await rejectUpload(filePath, 'OLE compound file is not a Word document');
    }
    return MS_WORD;
  }

  if (sniffed === 'application/zip' || sniffed === OOXML_WORD) {
    if (claimed !== OOXML_WORD) {
      return sniffed;
    }
    if (
      sniffed === 'application/zip' &&
      !(await containsBytes(filePath, DOCX_ZIP_PART))
    ) {
      await rejectUpload(filePath, 'ZIP archive is not a Word document');
    }
    return OOXML_WORD;
  }

  return sniffed;
}

/**
 * Sniff magic bytes after multer writes the file. Unlink and reject when the
 * real type is missing, not allowlisted, or does not match the claimed MIME.
 *
 * Detection is a bounded prefix read — no recursive/looping parser over
 * untrusted input (#262).
 */
export async function sniffAndValidateUpload(
  filePath: string,
  claimedMime: string,
): Promise<{ mime: string; ext: string }> {
  let detectedMime: string | undefined;
  try {
    const prefix = await sniffPrefix(filePath);
    detectedMime = detectFromPrefix(prefix);
  } catch {
    // Unreadable file — treat as undetected.
    detectedMime = undefined;
  }

  if (detectedMime) {
    detectedMime = await canonicalizeWordContainer(
      filePath,
      detectedMime,
      claimedMime,
    );
  }

  if (
    !detectedMime &&
    claimedMime === 'text/plain' &&
    (await looksLikeText(filePath))
  ) {
    detectedMime = 'text/plain';
  }

  if (!detectedMime) {
    await unlinkQuiet(filePath);
    throw new BadRequestException('Could not determine file type from content');
  }

  const mime: string = detectedMime;
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    await unlinkQuiet(filePath);
    throw new BadRequestException(`Unsupported file type: ${mime}`);
  }

  if (claimedMime !== mime) {
    await unlinkQuiet(filePath);
    throw new BadRequestException(
      `File content type ${mime} does not match claimed type ${claimedMime}`,
    );
  }

  return { mime, ext };
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
