import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { S3Service } from './s3.service';
import { config } from '../config/configuration';

const CAR_PHOTOS_DIR = join(process.cwd(), 'uploads', 'car-photos');

@Injectable()
export class UploadService {
  constructor(private readonly s3Service: S3Service) {}

  async uploadFile(
    file: { buffer: Buffer; mimetype?: string; originalname?: string },
  ): Promise<string> {
    if (this.s3Service.enabled) {
      return this.s3Service.upload(file, 'car-photos');
    }
    return this.saveLocal(file);
  }

  private async saveLocal(
    file: { buffer: Buffer; mimetype?: string; originalname?: string },
  ): Promise<string> {
    await mkdir(CAR_PHOTOS_DIR, { recursive: true });
    const filename = `car_${Date.now()}_${randomBytes(8).toString('hex')}.jpg`;
    const path = join(CAR_PHOTOS_DIR, filename);
    await writeFile(path, file.buffer);
    const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
    return `${baseUrl}/uploads/car-photos/${filename}`;
  }
}
