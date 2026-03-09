import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class PhoneValidationPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    const raw = value;
    const str: string =
      raw == null
        ? ''
        : typeof raw === 'string'
          ? raw
          : Array.isArray(raw)
            ? typeof raw[0] === 'string'
              ? raw[0]
              : typeof raw[0] === 'object' && raw[0] !== null
                ? ''
                : String(raw[0] ?? '')
            : typeof raw === 'object'
              ? ''
              : typeof raw === 'number' || typeof raw === 'boolean'
                ? String(raw)
                : '';
    const trimmed = str.trim();

    const receivedSafe =
      raw == null
        ? String(raw)
        : typeof raw === 'string'
          ? raw
          : typeof raw === 'object'
            ? '[object]'
            : typeof raw === 'number' || typeof raw === 'boolean'
              ? String(raw)
              : '';

    if (!trimmed) {
      throw new BadRequestException({
        message: 'Phone parametri kiritilishi shart',
        code: 'PHONE_REQUIRED',
        received: receivedSafe,
      });
    }

    const normalized = trimmed.replace(/\D/g, '');
    if (normalized.length < 7) {
      throw new BadRequestException({
        message: 'Telefon raqami kamida 7 ta raqamdan iborat bo‘lishi kerak',
        code: 'PHONE_INVALID',
        received: receivedSafe,
      });
    }

    return normalized;
  }
}
