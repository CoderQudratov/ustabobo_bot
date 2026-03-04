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
import { memoryStorage } from 'multer';
import { Public } from '../common/decorators/public.decorator';
import { TelegramWebAppGuard } from '../auth/guards/telegram-webapp.guard';
import { UploadService } from './upload.service';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const multerCarPhotoOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (
    _req: unknown,
    file: { mimetype?: string },
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!file?.mimetype?.startsWith('image/')) {
      return cb(new Error('Faqat rasm fayllar ruxsat etilgan'), false);
    }
    cb(null, true);
  },
};

@Controller('api')
@Public()
@UseGuards(TelegramWebAppGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerCarPhotoOptions))
  async uploadCarPhoto(
    @UploadedFile()
    file:
      | { buffer: Buffer; mimetype?: string; originalname?: string }
      | undefined,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Rasm fayl yuborilmadi');
    }
    const url = await this.uploadService.uploadFile(file);
    return { url };
  }
}
