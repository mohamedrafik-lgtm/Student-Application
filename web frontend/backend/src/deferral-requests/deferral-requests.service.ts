import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeferralRequestDto } from './dto/create-deferral-request.dto';
import { ReviewDeferralRequestDto } from './dto/review-deferral-request.dto';

@Injectable()
export class DeferralRequestsService {
  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء طلب تأجيل جديد من قبل المتدرب
   */
  async create(traineeId: number, createDto: CreateDeferralRequestDto) {
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: { program: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // التحقق من وجود الرسم
    const fee = await this.prisma.traineeFee.findUnique({
      where: { id: createDto.feeId },
      include: {
        paymentSchedule: true,
      }
    });

    if (!fee) {
      throw new NotFoundException('الرسم غير موجود');
    }

    // التحقق من أن الرسم ينتمي لبرنامج المتدرب
    if (fee.programId !== trainee.programId) {
      throw new BadRequestException('هذا الرسم لا ينتمي لبرنامجك التدريبي');
    }

    // التحقق من وجود جدول سداد للرسم
    if (!fee.paymentSchedule) {
      throw new BadRequestException('هذا الرسم ليس له موعد سداد محدد');
    }

    // التحقق من عدم وجود طلب مماثل قيد المراجعة
    const existingRequest = await this.prisma.paymentDeferralRequest.findFirst({
      where: {
        traineeId,
        feeId: createDto.feeId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new BadRequestException('لديك طلب مماثل قيد المراجعة بالفعل');
    }

    // حساب الموعد المطلوب
    const currentDeadline = fee.paymentSchedule.finalDeadline || fee.paymentSchedule.paymentEndDate;
    
    if (!currentDeadline) {
      throw new BadRequestException('لا يوجد موعد نهائي محدد للرسم');
    }

    const requestedDeadline = new Date(currentDeadline);
    requestedDeadline.setDate(requestedDeadline.getDate() + createDto.requestedExtensionDays);

    // إنشاء الطلب
    const request = await this.prisma.paymentDeferralRequest.create({
      data: {
        traineeId,
        feeId: createDto.feeId,
        reason: createDto.reason,
        requestedExtensionDays: createDto.requestedExtensionDays,
        requestedDeadline,
        status: 'PENDING',
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
          }
        },
        fee: {
          select: {
            id: true,
            name: true,
            amount: true,
          }
        }
      }
    });

    return request;
  }

  /**
   * جلب جميع الطلبات (للإدارة)
   */
  async findAll(filters?: {
    status?: string;
    programId?: number;
    traineeId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.programId) {
      where.trainee = {
        programId: filters.programId,
      };
    }

    if (filters?.traineeId) {
      where.traineeId = filters.traineeId;
    }

    const [requests, total] = await Promise.all([
      this.prisma.paymentDeferralRequest.findMany({
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
                select: {
                  nameAr: true,
                }
              }
            }
          },
          fee: {
            select: {
              id: true,
              name: true,
              amount: true,
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
      this.prisma.paymentDeferralRequest.count({ where })
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
   * جلب طلبات متدرب معين
   */
  async findMyRequests(traineeId: number) {
    return this.prisma.paymentDeferralRequest.findMany({
      where: { traineeId },
      include: {
        fee: {
          select: {
            id: true,
            name: true,
            amount: true,
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
    });
  }

  /**
   * جلب تفاصيل طلب واحد
   */
  async findOne(id: string) {
    const request = await this.prisma.paymentDeferralRequest.findUnique({
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
              }
            }
          }
        },
        fee: {
          select: {
            id: true,
            name: true,
            amount: true,
            paymentSchedule: true,
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
  async review(id: string, reviewDto: ReviewDeferralRequestDto, userId: string) {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException('تمت مراجعة هذا الطلب مسبقاً');
    }

    // إذا كان القرار قبول، إنشاء استثناء تلقائياً
    let createdExceptionId = null;

    if (reviewDto.status === 'APPROVED') {
      // حساب الموعد الجديد
      const currentSchedule = request.fee.paymentSchedule;
      
      if (!currentSchedule || !currentSchedule.finalDeadline) {
        throw new BadRequestException('لا يمكن إنشاء استثناء - الرسم ليس له موعد سداد محدد');
      }

      const newDeadline = new Date(currentSchedule.finalDeadline);
      newDeadline.setDate(newDeadline.getDate() + request.requestedExtensionDays);

      // إنشاء استثناء
      const exception = await this.prisma.traineePaymentException.create({
        data: {
          traineeId: request.traineeId,
          feeId: request.feeId,
          customPaymentEndDate: newDeadline,
          customGracePeriodDays: currentSchedule.gracePeriodDays || 0,
          customFinalDeadline: newDeadline,
          reason: `تأجيل بناءً على طلب المتدرب - ${request.reason}`,
          notes: reviewDto.adminResponse || 'تم قبول الطلب',
          createdBy: userId,
        }
      });

      createdExceptionId = exception.id;
    }

    // تحديث الطلب
    const updatedRequest = await this.prisma.paymentDeferralRequest.update({
      where: { id },
      data: {
        status: reviewDto.status as any,
        reviewedBy: userId,
        reviewedAt: new Date(),
        adminResponse: reviewDto.adminResponse,
        adminNotes: reviewDto.adminNotes,
        createdExceptionId,
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
          }
        },
        fee: {
          select: {
            name: true,
          }
        },
        reviewer: {
          select: {
            name: true,
          }
        }
      }
    });

    return updatedRequest;
  }

  /**
   * حذف طلب
   */
  async remove(id: string) {
    const request = await this.findOne(id);

    // لا يمكن حذف طلب تم قبوله إلا إذا تم حذف الاستثناء أولاً
    if (request.status === 'APPROVED' && request.createdExceptionId) {
      throw new ForbiddenException(
        'لا يمكن حذف طلب مقبول. يجب حذف الاستثناء المرتبط أولاً من قائمة الاستثناءات'
      );
    }

    await this.prisma.paymentDeferralRequest.delete({
      where: { id }
    });

    return { message: 'تم حذف الطلب بنجاح' };
  }

  /**
   * إحصائيات الطلبات
   */
  async getStats(allowedProgramIds?: number[]) {
    const baseWhere = allowedProgramIds ? { trainee: { programId: { in: allowedProgramIds } } } : {};
    
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.paymentDeferralRequest.count({ where: baseWhere }),
      this.prisma.paymentDeferralRequest.count({ where: { ...baseWhere, status: 'PENDING' } }),
      this.prisma.paymentDeferralRequest.count({ where: { ...baseWhere, status: 'APPROVED' } }),
      this.prisma.paymentDeferralRequest.count({ where: { ...baseWhere, status: 'REJECTED' } }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
    };
  }
}