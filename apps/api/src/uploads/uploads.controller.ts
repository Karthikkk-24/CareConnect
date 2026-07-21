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
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UploadsService } from './uploads.service';
import {
  detectMimeFromFile,
  extensionForMime,
  UPLOAD_ALLOWED_CLIENT_MIME,
} from './upload-mime';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

type AuthedRequest = Request & { user?: AuthenticatedUser };

@Controller('uploads')
@UseGuards(AuthGuard('clerk-jwt'))
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('patient-documents')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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
        if (!UPLOAD_ALLOWED_CLIENT_MIME.has(file.mimetype)) {
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
  async uploadPatientDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthedRequest,
  ) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Authentication required');
    this.uploadsService.assertCanUpload(user);

    if (!file) throw new BadRequestException('file is required');

    const detected = detectMimeFromFile(file.path);
    if (!detected || !UPLOAD_ALLOWED_CLIENT_MIME.has(detected)) {
      try {
        unlinkSync(file.path);
      } catch {
        /* ignore */
      }
      throw new BadRequestException(
        'File content does not match an allowed type (PDF, JPEG, PNG, WebP, GIF)',
      );
    }

    const expectedExt = extensionForMime(detected);
    const currentExt = extname(file.filename).toLowerCase();
    let finalName = file.filename;
    if (expectedExt && currentExt !== expectedExt) {
      finalName = `${randomUUID()}${expectedExt}`;
      renameSync(file.path, join(UPLOAD_DIR, finalName));
    }

    if (user.hospitalId) {
      await this.uploadsService.recordUploadMeta(
        finalName,
        user.hospitalId,
        user.id,
      );
    }

    const base =
      process.env.API_PUBLIC_URL?.replace(/\/$/, '') ||
      `${req.protocol}://${req.get('host')}`;
    return {
      url: `${base}/uploads/${finalName}`,
      fileName: file.originalname,
      fileType: detected,
      size: file.size,
    };
  }

  /** Authenticated, ACL-checked download — replaces public static PHI serving. */
  @Get(':filename')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async download(
    @Param('filename') filename: string,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Authentication required');

    const { filePath, mime } = await this.uploadsService.assertCanDownload(
      user,
      filename,
    );

    const contentType = mime || 'application/octet-stream';
    const isImage = contentType.startsWith('image/');
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `${isImage ? 'inline' : 'attachment'}; filename="${basenameSafe(filename)}"`,
    );
    createReadStream(filePath).pipe(res);
  }
}

function basenameSafe(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}
