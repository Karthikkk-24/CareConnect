import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Controller('uploads')
@UseGuards(AuthGuard('clerk-jwt'))
export class UploadsController {
  @Post('patient-documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname).slice(0, 16);
          cb(null, `${randomUUID()}${safeExt}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
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
}
