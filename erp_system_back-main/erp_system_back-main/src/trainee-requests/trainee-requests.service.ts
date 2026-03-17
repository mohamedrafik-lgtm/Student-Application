import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTraineeRequestDto, RequestType } from './dto/create-request.dto';
import { ReviewRequestDto } from './dto/review-request.dto';

@Injectable()
export class TraineeRequestsService {
  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء طلب جديد من قبل المتدرب
   */
  async create(traineeId: number, createDto: CreateTraineeRequestDto) {
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: { program: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // تحققات خاصة حسب نوع الطلب
    if (createDto.type === RequestType.EXAM_POSTPONE) {
      if (!createDto.examType || !createDto.examDate) {
        throw new BadRequestException('يجب تحديد نوع الاختبار وتاريخه');
      }
    }

    // إنشاء الطلب
    const request = await this.prisma.traineeRequest.create({
      data: {
        traineeId,
        type: createDto.type,
        reason: createDto.reason,
        attachmentUrl: createDto.attachmentUrl,
        attachmentCloudinaryId: createDto.attachmentCloudinaryId,
        examType: createDto.examType,
        examDate: createDto.examDate ? new Date(createDto.examDate) : null,
        status: 'PENDING',
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            program: {
              select: { nameAr: true }
            }
          }
        }
      }
    });

    return request;
  }

  /**
   * جلب طلبات متدرب معين
   */
  async findMyRequests(traineeId: number) {
    return this.prisma.traineeRequest.findMany({
      where: { traineeId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });
  }

  /**
   * جلب جميع الطلبات (للإدارة)
   */
  async findAll(filters?: {
    type?: string;
    status?: string;
    traineeId?: number;
    page?: number;
    limit?: number;
    allowedProgramIds?: number[];
  }) {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.traineeId) {
      where.traineeId = filters.traineeId;
    }

    // فلتر البرامج المسموحة
    if (filters?.allowedProgramIds) {
      where.trainee = { ...where.trainee, programId: { in: filters.allowedProgramIds } };
    }

    const [requests, total] = await Promise.all([
      this.prisma.traineeRequest.findMany({
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
              photoUrl: true,
              program: {
                select: { nameAr: true }
              }
            }
          },
          reviewer: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        }
      }),
      this.prisma.traineeRequest.count({ where })
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  /**
   * جلب تفاصيل طلب واحد
   */
  async findOne(id: string) {
    const request = await this.prisma.traineeRequest.findUnique({
      where: { id },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            phone: true,
            photoUrl: true,
            program: {
              select: { nameAr: true }
            }
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!request) {
      throw new NotFoundException('الطلب غير موجود');
    }

    return request;
  }

  /**
   * مراجعة طلب (قبول أو رفض)
   */
  async review(id: string, reviewDto: ReviewRequestDto, userId: string) {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException('تمت مراجعة هذا الطلب مسبقاً');
    }

    // تحديث الطلب
    const updatedRequest = await this.prisma.traineeRequest.update({
      where: { id },
      data: {
        status: reviewDto.status as any,
        reviewedBy: userId,
        reviewedAt: new Date(),
        adminResponse: reviewDto.adminResponse,
        adminNotes: reviewDto.adminNotes,
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
          }
        },
        reviewer: {
          select: { name: true }
        }
      }
    });

    return updatedRequest;
  }

  /**
   * حذف طلب
   */
  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.traineeRequest.delete({
      where: { id }
    });

    return { message: 'تم حذف الطلب بنجاح' };
  }

  /**
   * إحصائيات الطلبات
   */
  async getStats(type?: RequestType, allowedProgramIds?: number[]) {
    const where: any = type ? { type } : {};
    if (allowedProgramIds) where.trainee = { programId: { in: allowedProgramIds } };

    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.traineeRequest.count({ where }),
      this.prisma.traineeRequest.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.traineeRequest.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.traineeRequest.count({ where: { ...where, status: 'REJECTED' } }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
    };
  }
}