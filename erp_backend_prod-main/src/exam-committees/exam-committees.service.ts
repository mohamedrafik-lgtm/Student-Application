import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuditAction } from '@prisma/client';
import { CreateExamCommitteeDto, BulkCreateExamCommitteeDto } from './dto/create-exam-committee.dto';

@Injectable()
export class ExamCommitteesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private permissionsService: PermissionsService,
  ) {}

  private async ensureCanManage(actorId: string) {
    const userPerms = await this.permissionsService.getUserPermissions(actorId);
    if (!userPerms.hasPermission('dashboard.exam-committees', 'manage')) {
      throw new ForbiddenException('غير مصرح لك بإدارة لجان الاختبارات');
    }
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const whereClause: any = search ? {
      OR: [
        { traineeName: { contains: search } },
        { seatNumber: { contains: search } },
        { committeeNumber: { contains: search } },
        { nationalId: { contains: search } },
      ],
    } : {};

    const [total, items] = await Promise.all([
      this.prisma.examCommittee.count({ where: whereClause }),
      this.prisma.examCommittee.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async bulkCreate(dto: BulkCreateExamCommitteeDto, actorId: string) {
    await this.ensureCanManage(actorId);
    
    // Delete existing to replace them if needed, or just append? The requirements said "رفع شيتات اكسيل".
    // Usually bulk upload might just add, but if they want to replace, we should offer it. 
    // We'll just create them.
    
    const created = await this.prisma.examCommittee.createMany({
      data: dto.items,
    });

    await this.auditService.log({
      action: AuditAction.CREATE,
      entity: 'ExamCommittee',
      entityId: 'bulk',
      userId: actorId,
      details: { message: `Bulk created ${created.count} exam committees.` },
    });

    return { count: created.count, message: 'تم رفع البيانات بنجاح' };
  }

  async remove(id: number, actorId: string) {
    await this.ensureCanManage(actorId);

    const entity = await this.prisma.examCommittee.findUnique({ where: { id } });
    if (!entity) throw new NotFoundException(`Exam committee with ID ${id} not found`);

    await this.prisma.examCommittee.delete({ where: { id } });

    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'ExamCommittee',
      entityId: id.toString(),
      userId: actorId,
      details: { traineeName: entity.traineeName, seatNumber: entity.seatNumber },
    });

    return { id, message: 'Deleted successfully' };
  }

  async removeAll(actorId: string) {
    await this.ensureCanManage(actorId);

    const result = await this.prisma.examCommittee.deleteMany({});
    
    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'ExamCommittee',
      entityId: 'bulk-delete',
      userId: actorId,
      details: { message: `Deleted ${result.count} exam committees.` },
    });

    return { count: result.count, message: 'تم حذف جميع البيانات بنجاح' };
  }

  async lookupByNationalId(nationalId: string) {
    const normalized = nationalId.trim();

    if (!/^\d{14}$/.test(normalized)) {
      throw new BadRequestException('الرقم القومي يجب أن يكون 14 رقم');
    }

    let record = await this.prisma.examCommittee.findFirst({
      where: { nationalId: normalized },
    });

    if (!record) {
      const trainee = await this.prisma.trainee.findUnique({
        where: { nationalId: normalized },
        select: { nameAr: true },
      });

      if (trainee) {
        record = await this.prisma.examCommittee.findFirst({
          where: { traineeName: trainee.nameAr },
        });
      }
    }

    if (!record) {
      throw new NotFoundException('لا توجد بيانات لجان اختبار مسجلة لهذا الرقم القومي');
    }

    return {
      traineeName: record.traineeName,
      seatNumber: record.seatNumber,
      committeeNumber: record.committeeNumber,
      examDate: record.examDate,
      attendanceTime: record.attendanceTime,
    };
  }
}
