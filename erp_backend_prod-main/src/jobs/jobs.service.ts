import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../types';
import { toJsonValue } from '../lib/utils';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createJobDto: CreateJobDto, userId: string) {
    const job = await this.prisma.job.create({
      data: createJobDto,
    });

    await this.auditService.log({
      action: AuditAction.CREATE,
      entity: 'Job',
      entityId: String(job.id),
      userId,
      details: { message: `Created job with title: ${job.title}` },
    });

    return job;
  }

  async findAll() {
    return this.prisma.job.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new NotFoundException(`Invalid job ID format`);
    }
    
    const job = await this.prisma.job.findUnique({
      where: { id: numericId },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto, userId: string) {
    const before = await this.findOne(id);
    const numericId = parseInt(id, 10);

    const after = await this.prisma.job.update({
      where: { id: numericId },
      data: updateJobDto,
    });

    await this.auditService.log({
      action: AuditAction.UPDATE,
      entity: 'Job',
      entityId: id,
      userId,
      details: toJsonValue({ before, after }),
    });

    return after;
  }

  async remove(id: string, userId: string) {
    const job = await this.findOne(id);
    const numericId = parseInt(id, 10);

    await this.prisma.job.delete({
      where: { id: numericId },
    });

    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'Job',
      entityId: id,
      userId,
      details: toJsonValue({ message: `Deleted job: ${job.title}`, deletedData: job }),
    });

    return { message: 'Job deleted successfully' };
  }
}