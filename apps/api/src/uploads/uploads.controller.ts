import {
  Controller,
  Post,
  Get,
  Param,
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
import { diskStorage } from 'multer';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { extname, join, basename } from 'path';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UploadsService } from './uploads.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

type AuthedRequest = Request & { user?: AuthenticatedUser };

@Controller('uploads')
@UseGuards(AuthGuard('clerk-jwt'))
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('patient-documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR))
            mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname).slice(0, 16);
          cb(null, `${randomUUID()}${safeExt}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          cb(
            new BadRequestException(`Unsupported file type: ${file.mimetype}`),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadPatientDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthedRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    this.uploadsService.assertCanUpload(req.user);

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
    res.setHeader('Content-Disposition', `inline; filename="${safe}"`);
    createReadStream(path).pipe(res);
  }
}
