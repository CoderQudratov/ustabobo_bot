import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user?.is_super_admin) {
      throw new ForbiddenException(
        'Bu sahifaga faqat super admin kira oladi',
      );
    }
    return true;
  }
}
