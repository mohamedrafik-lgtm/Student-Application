import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ReviewComplaintDto } from './dto/review-complaint.dto';

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء شكوى/اقتراح من قبل المتدرب
   */
  async create(traineeId: number, createDto: CreateComplaintDto) {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    return this.prisma.complaintSuggestion.create({
      data: {
        traineeId,
        type: createDto.type,
        subject: createDto.subject,
        description: createDto.description,
        attachmentUrl: createDto.attachmentUrl,
        attachmentCloudinaryId: createDto.attachmentCloudinaryId,
        status: 'PENDING',
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
          },
        },
      },
    });
  }

  /**
   * جلب شكاوي/اقتراحات المتدرب
   */
  async findMyComplaints(traineeId: number) {
    return this.prisma.complaintSuggestion.findMany({
      where: { traineeId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * جلب جميع الشكاوي/الاقتراحات (للإدارة)
   */
  async findAll(filters?: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
    allowedProgramIds?: number[];
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    // فلتر البرامج المسموحة
    if (filters?.allowedProgramIds) {
      where.trainee = { programId: { in: filters.allowedProgramIds } };
    }

    const [items, total] = await Promise.all([
      this.prisma.complaintSuggestion.findMany({
        where,
        skip,
        take: limit,
        include: {
          trainee: {
            select: {
              id: true,
              nameAr: true,
              nationalId: true,
              phone: true,
              program: {
                select: {
                  nameAr: true,
                },
              },
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.complaintSuggestion.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * جلب تفاصيل شكوى/اقتراح
   */
  async findOne(id: string) {
    const item = await this.prisma.complaintSuggestion.findUnique({
      where: { id },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            phone: true,
            program: {
              select: {
                nameAr: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('العنصر غير موجود');
    }

    return item;
  }

  /**
   * مراجعة شكوى/اقتراح (للإدارة)
   */
  async review(id: string, reviewDto: ReviewComplaintDto, userId: string) {
    const item = await this.findOne(id);

    return this.prisma.complaintSuggestion.update({
      where: { id },
      data: {
        status: reviewDto.status as any,
        reviewedBy: userId,
        reviewedAt: new Date(),
        adminResponse: reviewDto.adminResponse,
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
          },
        },
        reviewer: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * حذف شكوى/اقتراح
   */
  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.complaintSuggestion.delete({
      where: { id },
    });

    return { message: 'تم الحذف بنجاح' };
  }

  /**
   * إحصائيات
   */
  async getStats(allowedProgramIds?: number[]) {
    const baseWhere = allowedProgramIds ? { trainee: { programId: { in: allowedProgramIds } } } : {};
    
    const [total, pending, inProgress, resolved, closed, complaints, suggestions] =
      await Promise.all([
        this.prisma.complaintSuggestion.count({ where: baseWhere }),
        this.prisma.complaintSuggestion.count({ where: { ...baseWhere, status: 'PENDING' } }),
        this.prisma.complaintSuggestion.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
        this.prisma.complaintSuggestion.count({ where: { ...baseWhere, status: 'RESOLVED' } }),
        this.prisma.complaintSuggestion.count({ where: { ...baseWhere, status: 'CLOSED' } }),
        this.prisma.complaintSuggestion.count({ where: { ...baseWhere, type: 'COMPLAINT' } }),
        this.prisma.complaintSuggestion.count({ where: { ...baseWhere, type: 'SUGGESTION' } }),
      ]);

    return {
      total,
      pending,
      inProgress,
      resolved,
      closed,
      complaints,
      suggestions,
    };
  }
}
