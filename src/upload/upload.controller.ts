import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { diskStorage } from 'multer';
import { Public } from '../common/decorators/public.decorator';
import { TelegramWebAppGuard } from '../auth/guards/telegram-webapp.guard';
import { config } from '../config/configuration';

const CAR_PHOTOS_DIR = join(process.cwd(), 'uploads', 'car-photos');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const multerCarPhotoOptions: MulterOptions = {
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req: unknown, file: { mimetype?: string }, cb: (error: Error | null, acceptFile: boolean) => void) => {
    if (!file?.mimetype?.startsWith('image/')) {
      return cb(new Error('Faqat rasm fayllar ruxsat etilgan'), false);
    }
    cb(null, true);
  },
  storage: diskStorage({
    destination: (_req, _file, cb) => cb(null, CAR_PHOTOS_DIR),
    filename: (_req, _file, cb) => {
      const name = `car_${Date.now()}_${randomBytes(8).toString('hex')}.jpg`;
      cb(null, name);
    },
  }),
};

interface UploadedCarPhoto {
  filename: string;
}

@Controller('api')
@Public()
@UseGuards(TelegramWebAppGuard)
export class UploadController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerCarPhotoOptions))
  uploadCarPhoto(@UploadedFile() file: UploadedCarPhoto | undefined): { url: string } {
    if (!file) {
      throw new BadRequestException('Rasm fayl yuborilmadi');
    }
    const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/uploads/car-photos/${file.filename}`;
    return { url };
  }
}
