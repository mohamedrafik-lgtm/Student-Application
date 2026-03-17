import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCommissionDto, UpdateCommissionDto, CreatePayoutDto } from './dto/commission.dto';
import { CommissionType, CommissionStatus } from '@prisma/client';

@Injectable()
export class CommissionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // إنشاء عمولة جديدة
  async createCommission(createCommissionDto: CreateCommissionDto, userId?: string) {
    try {
      // التحقق من وجود موظف التسويق
      const marketingEmployee = await this.prisma.marketingEmployee.findUnique({
        where: { id: createCommissionDto.marketingEmployeeId },
      });

      if (!marketingEmployee) {
        throw new NotFoundException('موظف التسويق غير موجود');
      }

      // التحقق من وجود المتدرب
      const trainee = await this.prisma.trainee.findUnique({
        where: { id: createCommissionDto.traineeId },
        include: {
          marketingEmployee: true,
          firstContactEmployee: true,
          secondContactEmployee: true,
        },
      });

      if (!trainee) {
        throw new NotFoundException('المتدرب غير موجود');
      }

      // التحقق من أن الموظف مسؤول عن هذا المتدرب
      const isResponsible = 
        trainee.marketingEmployeeId === createCommissionDto.marketingEmployeeId ||
        trainee.firstContactEmployeeId === createCommissionDto.marketingEmployeeId ||
        trainee.secondContactEmployeeId === createCommissionDto.marketingEmployeeId;

      if (!isResponsible) {
        throw new BadRequestException('هذا الموظف غير مسؤول عن هذا المتدرب');
      }

      // التحقق من عدم وجود عمولة مكررة لنفس المتدرب ونفس النوع ونفس الموظف
      const existingCommission = await this.prisma.commission.findFirst({
        where: {
          traineeId: createCommissionDto.traineeId,
          marketingEmployeeId: createCommissionDto.marketingEmployeeId,
          type: createCommissionDto.type,
        },
      });

      if (existingCommission) {
        // بدلاً من رمي خطأ، قم بتحديث العمولة الموجودة
        const updatedCommission = await this.prisma.commission.update({
          where: { id: existingCommission.id },
          data: {
            amount: createCommissionDto.amount,
            description: createCommissionDto.description,
          },
          include: {
            marketingEmployee: true,
            trainee: {
              select: {
                id: true,
                nameAr: true,
                program: {
                  select: {
                    id: true,
                    nameAr: true,
                  },
                },
              },
            },
          },
        });

        // تسجيل العملية في Audit
        await this.auditService.log({
          action: 'UPDATE',
          entity: 'Commission',
          entityId: String(updatedCommission.id),
          userId: userId || 'system',
          details: {
            message: `تم تحديث عمولة ${createCommissionDto.type === 'FIRST_CONTACT' ? 'تواصل أول' : 'تواصل ثاني'} من ${existingCommission.amount} إلى ${createCommissionDto.amount} للمتدرب ${trainee.nameAr}`,
            marketingEmployeeId: createCommissionDto.marketingEmployeeId,
            marketingEmployeeName: marketingEmployee.name,
            traineeId: createCommissionDto.traineeId,
            traineeName: trainee.nameAr,
            oldAmount: existingCommission.amount,
            newAmount: createCommissionDto.amount,
            type: createCommissionDto.type,
          },
        });

        return updatedCommission;
      }

      // إنشاء العمولة
      const commission = await this.prisma.commission.create({
        data: {
          marketingEmployeeId: createCommissionDto.marketingEmployeeId,
          traineeId: createCommissionDto.traineeId,
          type: createCommissionDto.type,
          amount: createCommissionDto.amount,
          description: createCommissionDto.description,
        },
        include: {
          marketingEmployee: true,
          trainee: {
            select: {
              id: true,
              nameAr: true,
              program: {
                select: {
                  id: true,
                  nameAr: true,
                },
              },
            },
          },
        },
      });

      // تسجيل العملية في Audit
      await this.auditService.log({
        action: 'CREATE',
        entity: 'Commission',
        entityId: String(commission.id),
        userId: userId || 'system',
        details: {
          message: `تم إنشاء عمولة ${createCommissionDto.type === 'FIRST_CONTACT' ? 'تواصل أول' : 'تواصل ثاني'} بقيمة ${createCommissionDto.amount} للمتدرب ${trainee.nameAr}`,
          marketingEmployeeId: createCommissionDto.marketingEmployeeId,
          marketingEmployeeName: marketingEmployee.name,
          traineeId: createCommissionDto.traineeId,
          traineeName: trainee.nameAr,
          amount: createCommissionDto.amount,
          type: createCommissionDto.type,
        },
      });

      return commission;
    } catch (error) {
      console.error('Error creating commission:', error);
      throw error;
    }
  }

  // جلب جميع العمولات مع الفلترة
  async getAllCommissions(filters?: {
    marketingEmployeeId?: number;
    status?: CommissionStatus;
    type?: CommissionType;
    searchTerm?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      console.log('🔍 Commission filters received:', filters);
      
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      
      if (filters?.marketingEmployeeId) {
        where.marketingEmployeeId = filters.marketingEmployeeId;
      }
      
      if (filters?.status) {
        where.status = filters.status;
      }
      
      if (filters?.type) {
        where.type = filters.type;
      }

      // البحث النصي - بحث بسيط وآمن
      if (filters?.searchTerm && filters.searchTerm.trim()) {
        const searchTerm = filters.searchTerm.trim();
        console.log('🔍 Searching for term:', searchTerm);
        
        // بحث آمن في وصف العمولة فقط
        try {
          where.description = {
            contains: searchTerm,
          };
        } catch (error) {
          console.error('Search error:', error);
          // تجاهل البحث في حالة الخطأ
        }
      }

      console.log('🔍 Final where clause:', JSON.stringify(where, null, 2));

      const [commissions, total] = await Promise.all([
        this.prisma.commission.findMany({
          where,
          include: {
            marketingEmployee: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            trainee: {
              select: {
                id: true,
                nameAr: true,
                program: {
                  select: {
                    id: true,
                    nameAr: true,
                  },
                },
              },
            },
            payouts: {
              include: {
                fromSafe: {
                  select: {
                    id: true,
                    name: true,
                    currency: true,
                  },
                },
                toSafe: {
                  select: {
                    id: true,
                    name: true,
                    currency: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.commission.count({ where }),
      ]);

      return {
        data: commissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error('Error fetching commissions:', error);
      throw error;
    }
  }

  // جلب إحصائيات العمولات
  async getCommissionStats(marketingEmployeeId?: number) {
    try {
      const where: any = {};
      
      if (marketingEmployeeId) {
        where.marketingEmployeeId = marketingEmployeeId;
      }

      const [totalCommissions, pendingCommissions, paidCommissions, totalAmount, pendingAmount, paidAmount] = await Promise.all([
        this.prisma.commission.count({ where }),
        this.prisma.commission.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.commission.count({ where: { ...where, status: 'PAID' } }),
        this.prisma.commission.aggregate({
          where,
          _sum: { amount: true },
        }),
        this.prisma.commission.aggregate({
          where: { ...where, status: 'PENDING' },
          _sum: { amount: true },
        }),
        this.prisma.commission.aggregate({
          where: { ...where, status: 'PAID' },
          _sum: { amount: true },
        }),
      ]);

      return {
        totalCommissions,
        pendingCommissions,
        paidCommissions,
        totalAmount: totalAmount._sum.amount || 0,
        pendingAmount: pendingAmount._sum.amount || 0,
        paidAmount: paidAmount._sum.amount || 0,
      };
    } catch (error) {
      console.error('Error fetching commission stats:', error);
      throw error;
    }
  }

  // جلب إحصائيات كل موظف تسويق
  async getMarketingEmployeesStats() {
    try {
      const employees = await this.prisma.marketingEmployee.findMany({
        where: { isActive: true },
        include: {
          commissions: {
            include: {
              payouts: true,
            },
          },
        },
      });

      console.log('🔍 Found employees:', employees.length);
      console.log('🔍 First employee commissions:', employees[0]?.commissions?.length || 0);

      return employees.map(employee => {
        const totalCommissions = employee.commissions.length;
        const pendingCommissions = employee.commissions.filter(c => c.status === 'PENDING').length;
        const paidCommissions = employee.commissions.filter(c => c.status === 'PAID').length;
        
        const totalAmount = employee.commissions.reduce((sum, c) => sum + Number(c.amount), 0);
        const pendingAmount = employee.commissions
          .filter(c => c.status === 'PENDING')
          .reduce((sum, c) => sum + Number(c.amount), 0);
        const paidAmount = employee.commissions
          .filter(c => c.status === 'PAID')
          .reduce((sum, c) => sum + Number(c.amount), 0);

        return {
          id: employee.id,
          name: employee.name,
          phone: employee.phone,
          totalCommissions,
          pendingCommissions,
          paidCommissions,
          totalAmount,
          pendingAmount,
          paidAmount,
        };
      });
    } catch (error) {
      console.error('Error fetching marketing employees stats:', error);
      throw error;
    }
  }

  // صرف عمولة
  async createPayout(commissionId: number, createPayoutDto: CreatePayoutDto, userId?: string) {
    try {
      // التحقق من وجود العمولة
      const commission = await this.prisma.commission.findUnique({
        where: { id: commissionId },
        include: {
          marketingEmployee: true,
          trainee: {
            select: {
              id: true,
              nameAr: true,
            },
          },
        },
      });

      if (!commission) {
        throw new NotFoundException('العمولة غير موجودة');
      }

      if (commission.status === 'PAID') {
        throw new BadRequestException('تم صرف هذه العمولة مسبقاً');
      }

      // التحقق من أن مبلغ الصرف لا يتجاوز قيمة العمولة
      if (createPayoutDto.amount > Number(commission.amount)) {
        throw new BadRequestException('مبلغ الصرف لا يمكن أن يتجاوز قيمة العمولة');
      }

      // التحقق من وجود الخزائن
      const [fromSafe, toSafe] = await Promise.all([
        this.prisma.safe.findUnique({ where: { id: createPayoutDto.fromSafeId } }),
        this.prisma.safe.findUnique({ where: { id: createPayoutDto.toSafeId } }),
      ]);

      if (!fromSafe || !toSafe) {
        throw new NotFoundException('إحدى الخزائن غير موجودة');
      }

      // التحقق من أن الخزائن مختلفة
      if (createPayoutDto.fromSafeId === createPayoutDto.toSafeId) {
        throw new BadRequestException('لا يمكن الصرف من وإلى نفس الخزينة');
      }

      // التحقق من رصيد الخزينة المصدر
      if (fromSafe.balance < createPayoutDto.amount) {
        throw new BadRequestException('رصيد الخزينة المصدر غير كافي');
      }

      // بدء المعاملة
      const result = await this.prisma.$transaction(async (prisma) => {
        // إنشاء عملية الصرف
        const payout = await prisma.commissionPayout.create({
          data: {
            commissionId,
            amount: createPayoutDto.amount,
            fromSafeId: createPayoutDto.fromSafeId,
            toSafeId: createPayoutDto.toSafeId,
            description: createPayoutDto.description,
            createdBy: userId || 'system',
          },
          include: {
            fromSafe: true,
            toSafe: true,
          },
        });

        // إنشاء المعاملة المالية
        console.log('🔍 Creating transaction with data:', {
          amount: createPayoutDto.amount,
          description: createPayoutDto.description,
          type: 'TRANSFER',
          sourceId: createPayoutDto.fromSafeId,
          targetId: createPayoutDto.toSafeId,
          reference: `COMMISSION_PAYOUT_${commissionId}`,
        });
        
        const transaction = await prisma.transaction.create({
          data: {
            amount: Number(createPayoutDto.amount),
            description: createPayoutDto.description,
            type: 'TRANSFER',
            sourceId: createPayoutDto.fromSafeId,
            targetId: createPayoutDto.toSafeId,
            reference: `COMMISSION_PAYOUT_${commissionId}`,
            createdById: userId || undefined,
          },
        });
        
        console.log('🔍 Transaction created successfully:', transaction);

        // تحديث رصيد الخزائن
        await prisma.safe.update({
          where: { id: createPayoutDto.fromSafeId },
          data: { balance: { decrement: createPayoutDto.amount } },
        });

        await prisma.safe.update({
          where: { id: createPayoutDto.toSafeId },
          data: { balance: { increment: createPayoutDto.amount } },
        });

        // تحديث حالة العمولة
        const updatedCommission = await prisma.commission.update({
          where: { id: commissionId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            paidBy: userId || 'system',
          },
          include: {
            marketingEmployee: true,
            trainee: {
              select: {
                id: true,
                nameAr: true,
              },
            },
          },
        });

        return { payout, commission: updatedCommission };
      });

      // تسجيل العملية في Audit
      await this.auditService.log({
        action: 'CREATE',
        entity: 'CommissionPayout',
        entityId: String(result.payout.id),
        userId: userId || 'system',
        details: {
          message: `تم صرف عمولة بقيمة ${createPayoutDto.amount} للمتدرب ${commission.trainee.nameAr}`,
          commissionId,
          marketingEmployeeId: commission.marketingEmployeeId,
          marketingEmployeeName: commission.marketingEmployee.name,
          traineeId: commission.traineeId,
          traineeName: commission.trainee.nameAr,
          amount: createPayoutDto.amount,
          fromSafeId: createPayoutDto.fromSafeId,
          fromSafeName: fromSafe.name,
          toSafeId: createPayoutDto.toSafeId,
          toSafeName: toSafe.name,
        },
      });

      return result;
    } catch (error) {
      console.error('Error creating payout:', error);
      throw error;
    }
  }

  // جلب عمولة واحدة
  async getCommissionById(id: number) {
    try {
      const commission = await this.prisma.commission.findUnique({
        where: { id },
        include: {
          marketingEmployee: true,
          trainee: {
            select: {
              id: true,
              nameAr: true,
              program: {
                select: {
                  id: true,
                  nameAr: true,
                },
              },
            },
          },
          payouts: {
            include: {
              fromSafe: true,
              toSafe: true,
            },
          },
        },
      });

      if (!commission) {
        throw new NotFoundException('العمولة غير موجودة');
      }

      return commission;
    } catch (error) {
      console.error('Error fetching commission:', error);
      throw error;
    }
  }

  // تحديث عمولة
  async updateCommission(id: number, updateCommissionDto: UpdateCommissionDto, userId?: string) {
    try {
      const commission = await this.prisma.commission.findUnique({
        where: { id },
      });

      if (!commission) {
        throw new NotFoundException('العمولة غير موجودة');
      }

      if (commission.status === 'PAID') {
        throw new BadRequestException('لا يمكن تعديل عمولة تم صرفها');
      }

      const updatedCommission = await this.prisma.commission.update({
        where: { id },
        data: updateCommissionDto,
        include: {
          marketingEmployee: true,
          trainee: {
            select: {
              id: true,
              nameAr: true,
            },
          },
        },
      });

      // تسجيل العملية في Audit
      await this.auditService.log({
        action: 'UPDATE',
        entity: 'Commission',
        entityId: String(id),
        userId: userId || 'system',
        details: {
          message: `تم تحديث عمولة ${commission.type === 'FIRST_CONTACT' ? 'تواصل أول' : 'تواصل ثاني'}`,
          changes: updateCommissionDto,
        },
      });

      return updatedCommission;
    } catch (error) {
      console.error('Error updating commission:', error);
      throw error;
    }
  }

  // حذف عمولة
  async deleteCommission(id: number, userId?: string) {
    try {
      const commission = await this.prisma.commission.findUnique({
        where: { id },
        include: {
          marketingEmployee: true,
          trainee: {
            select: {
              id: true,
              nameAr: true,
            },
          },
        },
      });

      if (!commission) {
        throw new NotFoundException('العمولة غير موجودة');
      }

      if (commission.status === 'PAID') {
        throw new BadRequestException('لا يمكن حذف عمولة تم صرفها');
      }

      await this.prisma.commission.delete({
        where: { id },
      });

      // تسجيل العملية في Audit
      await this.auditService.log({
        action: 'DELETE',
        entity: 'Commission',
        entityId: String(id),
        userId: userId || 'system',
        details: {
          message: `تم حذف عمولة ${commission.type === 'FIRST_CONTACT' ? 'تواصل أول' : 'تواصل ثاني'} بقيمة ${commission.amount}`,
          marketingEmployeeId: commission.marketingEmployeeId,
          marketingEmployeeName: commission.marketingEmployee.name,
          traineeId: commission.traineeId,
          traineeName: commission.trainee.nameAr,
          amount: commission.amount,
          type: commission.type,
        },
      });

      return { message: 'تم حذف العمولة بنجاح' };
    } catch (error) {
      console.error('Error deleting commission:', error);
      throw error;
    }
  }
}
