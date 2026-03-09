import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PhoneValidationPipe } from '../pipes/phone-validation.pipe';

/**
 * Query decorator that reads 'phone' and validates/normalizes it via PhoneValidationPipe.
 * Use when phone is required: @ParsePhone() phone: string
 */
export const ParsePhone = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<{ query: Record<string, unknown> }>();
    const raw = request.query?.['phone'];
    const pipe = new PhoneValidationPipe();
    return pipe.transform(raw);
  },
);
