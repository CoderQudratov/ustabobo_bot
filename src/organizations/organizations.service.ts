import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { PaymentType } from '../../generated/prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        contact_person: dto.contact_person,
        phone: dto.phone,
        payment_type: dto.payment_type as PaymentType,
        balance_due: dto.balance_due ?? 0,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.organization.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { vehicles: true },
    });
    if (!org) {
      throw new NotFoundException(`Organization with id "${id}" not found`);
    }
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findOne(id);
    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.contact_person !== undefined && { contact_person: dto.contact_person }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.payment_type !== undefined && { payment_type: dto.payment_type as PaymentType }),
        ...(dto.balance_due !== undefined && { balance_due: dto.balance_due }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.organization.delete({
      where: { id },
    });
  }
}
