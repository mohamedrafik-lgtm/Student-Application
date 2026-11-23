import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicalReportDto } from './dto/create-technical-report.dto';
import { ResolveTechnicalReportDto } from './dto/resolve-technical-report.dto';

@Injectable()
export class TechnicalReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForAdmin(userId: string, dto: CreateTechnicalReportDto) {
    return this.prisma.technicalIssueReport.create({
      data: { platform: 'ADMIN', adminUserId: userId, pageTitle: dto.pageTitle, pageUrl: dto.pageUrl, details: dto.details, imageUrl: dto.imageUrl },
      select: { id: true, createdAt: true },
    });
  }

  async createForTrainee(traineeId: number, dto: CreateTechnicalReportDto) {
    return this.prisma.technicalIssueReport.create({
      data: { platform: 'TRAINEE', traineeId, pageTitle: dto.pageTitle, pageUrl: dto.pageUrl, details: dto.details, imageUrl: dto.imageUrl },
      select: { id: true, createdAt: true },
    });
  }

  async findAll(query: { page?: string; limit?: string; search?: string; status?: string; platform?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const status = query.status && query.status !== 'ALL' ? query.status : undefined;
    const platform = query.platform && query.platform !== 'ALL' ? query.platform : undefined;
    if (status && !['OPEN', 'RESOLVED'].includes(status)) throw new BadRequestException('فلتر الحالة غير صحيح');
    if (platform && !['ADMIN', 'TRAINEE'].includes(platform)) throw new BadRequestException('فلتر المنصة غير صحيح');

    const where: Prisma.TechnicalIssueReportWhereInput = {
      ...(status ? { status: status as 'OPEN' | 'RESOLVED' } : {}),
      ...(platform ? { platform: platform as 'ADMIN' | 'TRAINEE' } : {}),
    };
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { details: { contains: search } },
        { pageUrl: { contains: search } },
        { pageTitle: { contains: search } },
        { resolutionReason: { contains: search } },
        { trainee: { nameAr: { contains: search } } },
        { trainee: { nationalId: { contains: search } } },
        { adminUser: { name: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.technicalIssueReport.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          trainee: { select: { id: true, nameAr: true, nationalId: true, phone: true } },
          adminUser: { select: { id: true, name: true } },
          resolvedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.technicalIssueReport.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async resolve(id: string, userId: string, dto: ResolveTechnicalReportDto) {
    const report = await this.prisma.technicalIssueReport.findUnique({ where: { id }, select: { id: true } });
    if (!report) throw new NotFoundException('البلاغ غير موجود');
    const reason = dto.reason?.trim();
    if (dto.resolved && !reason) throw new BadRequestException('اكتب سبب الحل قبل حفظ الحالة');
    return this.prisma.technicalIssueReport.update({
      where: { id },
      data: dto.resolved
        ? { status: 'RESOLVED', resolutionReason: reason, resolvedById: userId, resolvedAt: new Date() }
        : { status: 'OPEN', resolutionReason: null, resolvedById: null, resolvedAt: null },
      include: {
        trainee: { select: { id: true, nameAr: true, nationalId: true, phone: true } },
        adminUser: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
    });
  }
}
