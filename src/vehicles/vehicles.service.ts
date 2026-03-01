import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVehicleDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: dto.org_id },
    });
    if (!org) {
      throw new NotFoundException(`Organization with id "${dto.org_id}" not found`);
    }
    return this.prisma.vehicle.create({
      data: {
        org_id: dto.org_id,
        plate_number: dto.plate_number,
        model: dto.model,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.vehicle.findMany({
      include: { organization: true },
      orderBy: [{ organization: { name: 'asc' } }, { plate_number: 'asc' }],
    });
  }

  async findByOrganizationId(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException(`Organization with id "${orgId}" not found`);
    }
    return this.prisma.vehicle.findMany({
      where: { org_id: orgId },
      include: { organization: true },
      orderBy: { plate_number: 'asc' },
    });
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { organization: true },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id "${id}" not found`);
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    if (dto.org_id !== undefined) {
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.org_id },
      });
      if (!org) {
        throw new NotFoundException(`Organization with id "${dto.org_id}" not found`);
      }
    }
    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(dto.org_id !== undefined && { org_id: dto.org_id }),
        ...(dto.plate_number !== undefined && { plate_number: dto.plate_number }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vehicle.delete({
      where: { id },
    });
  }
}
