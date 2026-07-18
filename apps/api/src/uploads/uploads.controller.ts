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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { extname, join, basename } from 'path';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

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

@Controller('uploads')
@UseGuards(AuthGuard('clerk-jwt'))
export class UploadsController {
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
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('file is required');
    const base =
      process.env.API_PUBLIC_URL?.replace(/\/$/, '') ||
      `${req.protocol}://${req.get('host')}`;
    return {
      url: `${base}/uploads/${file.filename}`,
      fileName: file.originalname,
      fileType: file.mimetype,
      size: file.size,
    };
  }

  /** Authenticated download — replaces public static serving of PHI. */
  @Get(':filename')
  download(@Param('filename') filename: string, @Res() res: Response) {
    const safe = basename(filename);
    if (safe !== filename || safe.includes('..')) {
      throw new BadRequestException('Invalid filename');
    }
    const path = join(UPLOAD_DIR, safe);
    if (!existsSync(path)) throw new NotFoundException('File not found');
    res.setHeader('Content-Disposition', `inline; filename="${safe}"`);
    createReadStream(path).pipe(res);
  }
}
