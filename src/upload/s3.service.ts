import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

@Injectable()
export class S3Service implements OnModuleInit {
  private client!: S3Client;
  private bucket!: string;
  private isEnabled = false;

  onModuleInit() {
    const endpoint = process.env.S3_ENDPOINT?.trim();
    const region = process.env.S3_REGION?.trim() || 'us-east-1';
    const accessKey = process.env.S3_ACCESS_KEY?.trim();
    const secretKey = process.env.S3_SECRET_KEY?.trim();
    this.bucket = process.env.S3_BUCKET?.trim() || 'ustabobo';
    this.isEnabled = !!(endpoint && accessKey && secretKey);

    if (this.isEnabled) {
      this.client = new S3Client({
        endpoint,
        region,
        credentials: {
          accessKeyId: accessKey!,
          secretAccessKey: secretKey!,
        },
        forcePathStyle: true,
      });
    }
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  async upload(
    file: { buffer: Buffer; mimetype?: string; originalname?: string },
    folder = 'car-photos',
  ): Promise<string> {
    const ext =
      file.originalname?.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `${folder}/${randomUUID()}.${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'image/jpeg',
      }),
    );

    const endpoint = process.env.S3_ENDPOINT?.replace(/\/+$/, '') ?? '';
    return `${endpoint}/${this.bucket}/${key}`;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
