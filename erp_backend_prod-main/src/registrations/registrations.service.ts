import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { toJsonValue } from '../lib/utils';

@Injectable()
export class RegistrationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createRegistrationDto: CreateRegistrationDto) {
    return this.prisma.registration.create({
      data: createRegistrationDto,
    });
  }

  async findAll() {
    return this.prisma.registration.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new NotFoundException(`Invalid registration ID format`);
    }
    
    const registration = await this.prisma.registration.findUnique({
      where: { id: numericId },
    });

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    return registration;
  }

  async update(id: string, updateRegistrationDto: UpdateRegistrationDto, userId: string) {
    const before = await this.findOne(id);
    const numericId = parseInt(id, 10);

    const after = await this.prisma.registration.update({
      where: { id: numericId },
      data: updateRegistrationDto,
    });

    await this.auditService.log({
      action: AuditAction.UPDATE,
      entity: 'Registration',
      entityId: id,
      userId,
      details: toJsonValue({ before, after }),
    });

    return after;
  }

  async remove(id: string, userId: string) {
    const registration = await this.findOne(id);
    const numericId = parseInt(id, 10);

    await this.prisma.registration.delete({
      where: { id: numericId },
    });

    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'Registration',
      entityId: id,
      userId,
      details: toJsonValue({ message: `Deleted registration for ${registration.traineeName}`, deletedData: registration }),
    });

    return { message: 'Registration deleted successfully' };
  }
}