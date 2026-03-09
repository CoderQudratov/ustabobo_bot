import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class PhoneValidationPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    const raw = value;
    const str =
      raw == null
        ? ''
        : Array.isArray(raw)
          ? (raw[0] ?? '')
          : String(raw ?? '');
    const trimmed = typeof str === 'string' ? str.trim() : '';

    if (!trimmed) {
      throw new BadRequestException({
        message: 'Phone parametri kiritilishi shart',
        code: 'PHONE_REQUIRED',
        received: raw,
      });
    }

    const normalized = trimmed.replace(/\D/g, '');
    if (normalized.length < 7) {
      throw new BadRequestException({
        message: 'Telefon raqami kamida 7 ta raqamdan iborat bo‘lishi kerak',
        code: 'PHONE_INVALID',
        received: raw,
      });
    }

    return normalized;
  }
}
