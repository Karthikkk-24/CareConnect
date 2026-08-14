import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
  Res,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { PERMISSIONS } from '@careconnect/types';
import { diskStorage } from 'multer';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { extname, join, basename } from 'path';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AllowAuthenticated } from '../rbac/allow-authenticated.decorator';
import { PermissionsAny } from '../rbac/permissions-any.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { UploadsService } from './uploads.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

/** MIME → allowed extension (server-chosen; never trust client extension alone). */
const MIME_TO_EXT: Record<string, string> = {
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

const EXT_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_TO_EXT).map(([mime, ext]) => [ext, mime]),
);

/** Preview-safe types may be inline; everything else downloads as attachment. */
const INLINE_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
]);

type AuthedRequest = Request & { user?: AuthenticatedUser };

@Controller('uploads')
@UseGuards(AuthGuard('clerk-jwt'), RolesGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('patient-documents')
  @PermissionsAny(PERMISSIONS.PATIENTS_WRITE, PERMISSIONS.LAB_WRITE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR))
            mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = MIME_TO_EXT[file.mimetype];
          if (!ext) {
            cb(
              new BadRequestException(
                `Unsupported file type: ${file.mimetype}`,
              ),
              '',
            );
            return;
          }
          // Ignore client original extension — store only allowlisted ext (#206).
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!MIME_TO_EXT[file.mimetype]) {
          cb(
            new BadRequestException(`Unsupported file type: ${file.mimetype}`),
            false,
          );
          return;
        }
        const clientExt = extname(file.originalname).toLowerCase();
        const expected = MIME_TO_EXT[file.mimetype];
        // Reject obvious MIME/extension mismatches (e.g. .html claimed as pdf).
        if (
          clientExt &&
          clientExt !== expected &&
          !(file.mimetype === 'image/jpeg' && clientExt === '.jpeg')
        ) {
          cb(
            new BadRequestException(
              `File extension ${clientExt} does not match type ${file.mimetype}`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadPatientDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthedRequest,
    @Query('hospitalId') hospitalId?: string,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    await this.uploadsService.assertCanUpload(req.user, hospitalId);

    if (!file) throw new BadRequestException('file is required');
    // Prefer configured public base; otherwise return a stable relative path
    // so client-controlled Host headers cannot poison stored document URLs.
    const configured = process.env.API_PUBLIC_URL?.replace(/\/$/, '');
    const url = configured
      ? `${configured}/uploads/${file.filename}`
      : `/uploads/${file.filename}`;
    return {
      url,
      fileName: file.originalname,
      fileType: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Authenticated, hospital/patient-scoped download.
   * Replaces public static serving of PHI; requires a matching patient_documents row.
   */
  @Get(':filename')
  @AllowAuthenticated()
  async download(
    @Param('filename') filename: string,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');

    const safe = basename(filename);
    if (safe !== filename || safe.includes('..')) {
      throw new BadRequestException('Invalid filename');
    }

    await this.uploadsService.assertCanDownload(safe, req.user);

    const path = join(UPLOAD_DIR, safe);
    if (!existsSync(path)) throw new NotFoundException('File not found');

    const ext = extname(safe).toLowerCase();
    const contentType = EXT_TO_MIME[ext] ?? 'application/octet-stream';
    const disposition = INLINE_MIME.has(contentType) ? 'inline' : 'attachment';

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `${disposition}; filename="${safe}"`);
    createReadStream(path).pipe(res);
  }
}
