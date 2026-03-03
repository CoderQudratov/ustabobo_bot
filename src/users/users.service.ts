import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existingLogin = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });
    if (existingLogin) {
      throw new ConflictException(
        `User with login "${dto.login}" already exists`,
      );
    }
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existingPhone) {
      throw new ConflictException(
        `User with phone "${dto.phone}" already exists`,
      );
    }
    if (dto.role !== 'master' && dto.role !== 'driver') {
      throw new ConflictException(
        'Staff can only be created with role master or driver',
      );
    }

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const percent_rate = dto.percent_rate ?? 0;
    const is_active = dto.is_active ?? true;

    const user = await this.prisma.user.create({
      data: {
        fullname: dto.fullname,
        phone: dto.phone,
        login: dto.login,
        password_hash,
        role: dto.role as Role,
        percent_rate,
        balance: 0,
        is_active,
      },
      select: {
        id: true,
        fullname: true,
        phone: true,
        login: true,
        role: true,
        percent_rate: true,
        is_active: true,
        balance: true,
      },
    });
    return user;
  }
}
