import { BadRequestException } from '@nestjs/common';
import { mkdtemp, writeFile, rm, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { constants as fsConstants } from 'fs';
import { crc32 } from 'zlib';
import {
  sniffAndValidateUpload,
  ensureStoredExtension,
  MIME_TO_EXT,
} from './upload-file-type';

const OOXML_WORD =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const PNG = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  ...Buffer.alloc(24),
]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(16)]);
const PDF = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\ntrailer');
const GIF = Buffer.from('GIF89a' + '\0'.repeat(20));
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([16, 0, 0, 0]),
  Buffer.from('WEBP'),
]);
const HTML = Buffer.from('<!DOCTYPE html><html><body>hi</body></html>');
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64)]);
const TEXT = Buffer.from('Patient intake notes — plain text.');
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
/** OLE container with no Word stream — same magic as xls/ppt/msg. */
const OLE_GENERIC = Buffer.concat([OLE_MAGIC, Buffer.alloc(64)]);
const OLE_WORD = Buffer.concat([
  OLE_MAGIC,
  Buffer.alloc(64),
  Buffer.from('WordDocument', 'utf16le'),
]);
const OLE_EXCEL = Buffer.concat([
  OLE_MAGIC,
  Buffer.alloc(64),
  Buffer.from('Workbook', 'utf16le'),
]);
const OLE_PPT = Buffer.concat([
  OLE_MAGIC,
  Buffer.alloc(64),
  Buffer.from('PowerPoint Document', 'utf16le'),
]);

function storedZip(filename: string, content: Buffer): Buffer {
  const name = Buffer.from(filename);
  const crc = crc32(content) >>> 0;
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(content.length, 18);
  local.writeUInt32LE(content.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(content.length, 20);
  central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(name.length, 28);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(46 + name.length, 12);
  eocd.writeUInt32LE(30 + name.length + content.length, 16);
  return Buffer.concat([local, name, content, central, name, eocd]);
}

const DOCX_ZIP = storedZip('word/document.xml', Buffer.from('<w:document/>'));
const XLSX_ZIP = storedZip('xl/workbook.xml', Buffer.from('<workbook/>'));
const GENERIC_ZIP = storedZip('readme.txt', Buffer.from('not office'));

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe('sniffAndValidateUpload', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'upload-sniff-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const write = async (name: string, buf: Buffer) => {
    const path = join(dir, name);
    await writeFile(path, buf);
    return path;
  };

  it('accepts PNG content claimed as image/png', async () => {
    const path = await write('a.png', PNG);
    await expect(sniffAndValidateUpload(path, 'image/png')).resolves.toEqual({
      mime: 'image/png',
      ext: '.png',
    });
    expect(await exists(path)).toBe(true);
  });

  it('accepts JPEG, PDF, GIF, and WebP when claim matches sniff', async () => {
    await expect(
      sniffAndValidateUpload(await write('a.jpg', JPEG), 'image/jpeg'),
    ).resolves.toEqual({ mime: 'image/jpeg', ext: '.jpg' });
    await expect(
      sniffAndValidateUpload(await write('a.pdf', PDF), 'application/pdf'),
    ).resolves.toEqual({ mime: 'application/pdf', ext: '.pdf' });
    await expect(
      sniffAndValidateUpload(await write('a.gif', GIF), 'image/gif'),
    ).resolves.toEqual({ mime: 'image/gif', ext: '.gif' });
    await expect(
      sniffAndValidateUpload(await write('a.webp', WEBP), 'image/webp'),
    ).resolves.toEqual({ mime: 'image/webp', ext: '.webp' });
  });

  it('accepts text/plain when there is no binary magic', async () => {
    const path = await write('notes.txt', TEXT);
    await expect(sniffAndValidateUpload(path, 'text/plain')).resolves.toEqual({
      mime: 'text/plain',
      ext: '.txt',
    });
  });

  it('accepts OLE CFB as Word only when claimed msword and WordDocument stream exists', async () => {
    const path = await write('letter.doc', OLE_WORD);
    await expect(
      sniffAndValidateUpload(path, 'application/msword'),
    ).resolves.toEqual({ mime: 'application/msword', ext: '.doc' });
    expect(await exists(path)).toBe(true);
  });

  it('rejects generic OLE claimed as msword (xls/ppt/msg share x-cfb)', async () => {
    const path = await write('letter.doc', OLE_GENERIC);
    await expect(
      sniffAndValidateUpload(path, 'application/msword'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await exists(path)).toBe(false);
  });

  it('rejects Excel OLE claimed as application/msword', async () => {
    const path = await write('sheet.doc', OLE_EXCEL);
    await expect(
      sniffAndValidateUpload(path, 'application/msword'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await exists(path)).toBe(false);
  });

  it('rejects PowerPoint OLE claimed as application/msword', async () => {
    const path = await write('deck.doc', OLE_PPT);
    await expect(
      sniffAndValidateUpload(path, 'application/msword'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await exists(path)).toBe(false);
  });

  it('rejects Word OLE claimed as a non-Word MIME', async () => {
    const path = await write('letter.pdf', OLE_WORD);
    await expect(
      sniffAndValidateUpload(path, 'application/pdf'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await exists(path)).toBe(false);
  });

  it('accepts ZIP as docx only when claimed OOXML Word and word/document.xml is present', async () => {
    const path = await write('letter.docx', DOCX_ZIP);
    await expect(sniffAndValidateUpload(path, OOXML_WORD)).resolves.toEqual({
      mime: OOXML_WORD,
      ext: '.docx',
    });
    expect(await exists(path)).toBe(true);
  });

  it('rejects xlsx ZIP claimed as OOXML Word', async () => {
    const path = await write('sheet.docx', XLSX_ZIP);
    await expect(
      sniffAndValidateUpload(path, OOXML_WORD),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await exists(path)).toBe(false);
  });

  it('rejects generic ZIP claimed as OOXML Word', async () => {
    const path = await write('archive.docx', GENERIC_ZIP);
    await expect(
      sniffAndValidateUpload(path, OOXML_WORD),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await exists(path)).toBe(false);
  });

  it('rejects HTML claimed as PDF and unlinks the file', async () => {
    const path = await write('evil.pdf', HTML);
    await expect(
      sniffAndValidateUpload(path, 'application/pdf'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await exists(path)).toBe(false);
  });

  it('rejects an executable claimed as PNG and unlinks the file', async () => {
    const path = await write('evil.png', EXE);
    await expect(
      sniffAndValidateUpload(path, 'image/png'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await exists(path)).toBe(false);
  });

  it('rejects PNG content claimed as JPEG (lied MIME)', async () => {
    const path = await write('lied.jpg', PNG);
    await expect(
      sniffAndValidateUpload(path, 'image/jpeg'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await exists(path)).toBe(false);
  });

  it('rejects text claimed as PDF (no magic)', async () => {
    const path = await write('notes.pdf', TEXT);
    await expect(
      sniffAndValidateUpload(path, 'application/pdf'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await exists(path)).toBe(false);
  });

  it('rejects unknown binary claimed as text/plain', async () => {
    const path = await write('notes.txt', Buffer.from([0, 1, 2, 3, 4, 5]));
    await expect(
      sniffAndValidateUpload(path, 'text/plain'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await exists(path)).toBe(false);
  });

  it('allowlist keys match MIME_TO_EXT', () => {
    expect(Object.keys(MIME_TO_EXT).sort()).toEqual(
      [
        'application/msword',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/gif',
        'image/jpeg',
        'image/png',
        'image/webp',
        'text/plain',
      ].sort(),
    );
  });
});

describe('ensureStoredExtension', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'upload-ext-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('renames when the stored extension does not match sniffed type', async () => {
    const path = join(dir, 'abc.jpg');
    await writeFile(path, PNG);
    const name = await ensureStoredExtension(path, '.png');
    expect(name).toBe('abc.png');
    expect(await exists(join(dir, 'abc.png'))).toBe(true);
    expect(await exists(path)).toBe(false);
  });

  it('keeps the name when the extension already matches', async () => {
    const path = join(dir, 'abc.png');
    await writeFile(path, PNG);
    await expect(ensureStoredExtension(path, '.png')).resolves.toBe('abc.png');
    expect(await exists(path)).toBe(true);
  });
});
