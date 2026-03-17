import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../audit/audit.service';
import { CommissionsService } from '../commissions/commissions.service';
import { CreateMarketingEmployeeDto, UpdateMarketingEmployeeDto } from './dto/marketing-employee.dto';
import { CreateMarketingTargetDto, UpdateMarketingTargetDto } from './dto/marketing-target.dto';
import { CreateMarketingApplicationDto, UpdateMarketingApplicationDto } from './dto/marketing-application.dto';
import { UpdateTraineeContactDto } from './dto/update-trainee-contact.dto';
import { ApplicationStatus, AuditAction } from '@prisma/client';

@Injectable()
export class MarketingService {
  constructor(
    private prisma: PrismaService,
    private whatsappService: UnifiedWhatsAppService,
    private settingsService: SettingsService,
    private auditService: AuditService,
    private commissionsService: CommissionsService,
  ) {}

  // ==================== موظفي التسويق ====================

  async createEmployee(data: CreateMarketingEmployeeDto) {
    try {
      return await this.prisma.marketingEmployee.create({
        data,
        include: {
          marketingTargets: {
            where: {
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('رقم الهاتف مسجل من قبل ولا يمكن تكراره. يرجى استخدام رقم هاتف آخر.');
      }
      throw error;
    }
  }

  async getAllEmployees() {
    console.log('🔍 Getting all marketing employees...');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const employees = await this.prisma.marketingEmployee.findMany({
      include: {
        marketingTargets: {
          where: {
            month: currentMonth,
            year: currentYear,
          },
        },
        _count: {
          select: {
            trainees: true, // عدد المتدربين المُعيَّنين
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // إضافة إحصائيات التواصل الأول والثاني لكل موظف
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const employeesWithTotals = await Promise.all(
      employees.map(async (employee) => {
        // حساب إجمالي المتدربين الذين تعامل معهم الموظف (تعيين عام أو تواصل أول أو تواصل ثاني)
        const totalAssignedTrainees = await this.prisma.trainee.count({
          where: {
            OR: [
              { marketingEmployeeId: employee.id },
              { firstContactEmployeeId: employee.id },
              { secondContactEmployeeId: employee.id },
            ],
          },
        });

        // حساب التواصل الأول للشهر الحالي
        const monthlyFirstContact = await this.prisma.trainee.count({
          where: {
            firstContactEmployeeId: employee.id,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // حساب التواصل الثاني للشهر الحالي
        const monthlySecondContact = await this.prisma.trainee.count({
          where: {
            secondContactEmployeeId: employee.id,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        return {
          ...employee,
          totalAssignedTrainees,
          monthlyFirstContact,
          monthlySecondContact,
        };
      })
    );

    console.log('🔍 Returning employees:', employeesWithTotals.length);
        // إضافة تفاصيل أكثر للـ logging
        for (const emp of employeesWithTotals.slice(0, 2)) {
          console.log(`📊 Employee: ${emp.name}`);
          console.log(`   - Total Assigned: ${emp.totalAssignedTrainees}`);
          console.log(`   - Monthly First Contact: ${emp.monthlyFirstContact}`);
          console.log(`   - Monthly Second Contact: ${emp.monthlySecondContact}`);
          console.log(`   - Targets: ${emp.marketingTargets.length}`);
          
          // فحص تفصيلي للمتدربين
          const assignedViaMarketing = await this.prisma.trainee.count({
            where: { marketingEmployeeId: emp.id }
          });
          const assignedViaFirstContact = await this.prisma.trainee.count({
            where: { firstContactEmployeeId: emp.id }
          });
          const assignedViaSecondContact = await this.prisma.trainee.count({
            where: { secondContactEmployeeId: emp.id }
          });
          
          console.log(`   - Assigned via marketingEmployeeId: ${assignedViaMarketing}`);
          console.log(`   - Assigned via firstContactEmployeeId: ${assignedViaFirstContact}`);
          console.log(`   - Assigned via secondContactEmployeeId: ${assignedViaSecondContact}`);
          console.log('   ---');
        }
    return employeesWithTotals;
  }

  async getEmployeeById(id: number) {
    const employee = await this.prisma.marketingEmployee.findUnique({
      where: { id },
      include: {
        marketingTargets: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
        trainees: {
          orderBy: { createdAt: 'desc' },
          take: 10, // آخر 10 متدربين مُعيَّنين
          include: {
            program: {
              select: {
                nameAr: true,
              },
            },
          },
        },
        _count: {
          select: {
            trainees: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('موظف التسويق غير موجود');
    }

    // إضافة إجمالي المتدربين المُعيَّنين
    const totalAssignedTrainees = await this.prisma.trainee.count({
      where: {
        marketingEmployeeId: id,
      },
    });

    return {
      ...employee,
      totalAssignedTrainees,
    };
  }

  async updateEmployee(id: number, data: UpdateMarketingEmployeeDto) {
    try {
      return await this.prisma.marketingEmployee.update({
        where: { id },
        data,
        include: {
          marketingTargets: {
            where: {
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('موظف التسويق غير موجود');
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('رقم الهاتف مسجل من قبل ولا يمكن تكراره. يرجى استخدام رقم هاتف آخر.');
      }
      throw error;
    }
  }

  async deleteEmployee(id: number) {
    try {
      return await this.prisma.marketingEmployee.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('موظف التسويق غير موجود');
      }
      throw error;
    }
  }

  // ==================== أهداف التسويق ====================

  async setTarget(data: CreateMarketingTargetDto) {
    try {
      return await this.prisma.marketingTarget.upsert({
        where: {
          employeeId_month_year: {
            employeeId: data.employeeId,
            month: data.month,
            year: data.year,
          },
        },
        update: {
          targetAmount: data.targetAmount,
          notes: data.notes,
          setById: data.setById,
          setAt: new Date(),
        },
        create: data,
        include: {
          employee: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new NotFoundException('موظف التسويق غير موجود');
      }
      throw error;
    }
  }

  async getTargetsByEmployee(employeeId: number, year?: number) {
    const targetYear = year || new Date().getFullYear();

    const targets = await this.prisma.marketingTarget.findMany({
      where: {
        employeeId,
        year: targetYear,
      },
      include: {
        employee: true,
      },
      orderBy: {
        month: 'asc',
      },
    });

    // حساب المتدربين بالتواصل الأول لكل شهر (هذا ما يحتسب في التارجت)
    const targetsWithAchieved = await Promise.all(
      targets.map(async (target) => {
        const startDate = new Date(target.year, target.month - 1, 1);
        const endDate = new Date(target.year, target.month, 0, 23, 59, 59);

        const achievedCount = await this.prisma.trainee.count({
          where: {
            firstContactEmployeeId: target.employeeId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // تحديث achievedAmount في قاعدة البيانات
        await this.prisma.marketingTarget.update({
          where: { id: target.id },
          data: { achievedAmount: achievedCount },
        });

        return {
          ...target,
          achievedAmount: achievedCount,
        };
      })
    );

    return targetsWithAchieved;
  }

  async getAllTargets(month?: number, year?: number) {
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    // تاريخ بداية ونهاية الشهر
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const targets = await this.prisma.marketingTarget.findMany({
      where: {
        month: targetMonth,
        year: targetYear,
      },
      include: {
        employee: true,
      },
      orderBy: {
        employee: {
          name: 'asc',
        },
      },
    });

    // حساب المتدربين بالتواصل الأول لكل موظف في هذا الشهر (هذا ما يحتسب في التارجت)
    const targetsWithAchieved = await Promise.all(
      targets.map(async (target) => {
        const achievedCount = await this.prisma.trainee.count({
          where: {
            firstContactEmployeeId: target.employeeId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // تحديث achievedAmount في قاعدة البيانات
        await this.prisma.marketingTarget.update({
          where: { id: target.id },
          data: { achievedAmount: achievedCount },
        });

        return {
          ...target,
          achievedAmount: achievedCount,
        };
      })
    );

    return targetsWithAchieved;
  }

  async updateTarget(id: number, data: UpdateMarketingTargetDto) {
    try {
      return await this.prisma.marketingTarget.update({
        where: { id },
        data: {
          ...data,
          setAt: new Date(),
        },
        include: {
          employee: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('الهدف غير موجود');
      }
      throw error;
    }
  }

  // ==================== التقديمات ====================

  async createApplication(data: CreateMarketingApplicationDto) {
    const application = await this.prisma.marketingApplication.create({
      data,
      include: {
        employee: true,
      },
    });

    // تحديث عدد التقديمات للموظف
    await this.updateEmployeeApplicationsCount(data.employeeId);

    return application;
  }

  async getAllTraineesWithMarketing(page = 1, limit = 10, filters?: {
    search?: string;
    status?: string;
    employeeId?: number;
    unassigned?: boolean;
  }) {
    const skip = (page - 1) * limit;

    // بناء شروط البحث
    const where: any = {};

    if (filters?.search) {
      // تنظيف نص البحث من الفراغات الزائدة
      const searchTerm = filters.search.trim();
      
      where.OR = [
        { nameAr: { contains: searchTerm } },
        { nameEn: { contains: searchTerm } },
        { phone: { contains: searchTerm } },
        { nationalId: { contains: searchTerm } },
        { email: { contains: searchTerm } },
      ];
    }

    if (filters?.status) {
      where.traineeStatus = filters.status;
    }

    if (filters?.employeeId) {
      where.firstContactEmployeeId = filters.employeeId;
    }

    if (filters?.unassigned) {
      where.AND = [
        { firstContactEmployeeId: null },
        { secondContactEmployeeId: null },
      ];
    }

    const [trainees, total] = await Promise.all([
      this.prisma.trainee.findMany({
        where,
        skip,
        take: limit,
        include: {
          marketingEmployee: {
            select: {
              id: true,
              name: true,
            },
          },
          firstContactEmployee: {
            select: {
              id: true,
              name: true,
            },
          },
          secondContactEmployee: {
            select: {
              id: true,
              name: true,
            },
          },
          program: {
            select: {
              id: true,
              nameAr: true,
            },
          },
          traineePayments: {
            select: {
              paidAmount: true,
            },
          },
        },
        orderBy: [
          // أولوية للمتدربين غير المعيين للتواصل الأول أو الثاني
          {
            firstContactEmployeeId: {
              sort: 'asc',
              nulls: 'first',
            },
          },
          {
            secondContactEmployeeId: {
              sort: 'asc', 
              nulls: 'first',
            },
          },
          {
            createdAt: 'desc',
          },
        ],
      }),
      this.prisma.trainee.count({ where }),
    ]);

    // حساب إجمالي المبلغ المدفوع لكل متدرب
    const traineesWithPayments = trainees.map(trainee => ({
      ...trainee,
      totalPaidAmount: trainee.traineePayments.reduce((sum, payment) => sum + payment.paidAmount, 0),
    }));

    return {
      data: traineesWithPayments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };
  }

  async assignTraineeToMarketingEmployee(traineeId: number, marketingEmployeeId: number | null, userId?: string) {
    // تحديث المتدرب
    const trainee = await this.prisma.trainee.update({
      where: { id: traineeId },
      data: { marketingEmployeeId },
      include: {
        marketingEmployee: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        program: {
          select: {
            id: true,
            nameAr: true,
          },
        },
      },
    });

    // تحديث عداد التطبيقات لموظفي التسويق
    if (marketingEmployeeId) {
      await this.updateEmployeeApplicationsCount(marketingEmployeeId);

      // إرسال رسالة WhatsApp لموظف التسويق
      try {
        console.log(`📱 Sending WhatsApp notification for trainee ${traineeId} to employee ${marketingEmployeeId}`);
        await this.sendMarketingEmployeeNotification(trainee, userId);
      } catch (error) {
        console.error('Error sending WhatsApp notification to marketing employee:', error);
        // لا نفشل العملية إذا فشل إرسال الرسالة
      }
    }

    // إذا كان المتدرب مُعيَّن سابقاً لموظف آخر، نحدث عداده أيضاً
    const previousEmployee = await this.prisma.trainee.findFirst({
      where: { id: traineeId },
      select: { marketingEmployeeId: true },
    });

    if (previousEmployee?.marketingEmployeeId && previousEmployee.marketingEmployeeId !== marketingEmployeeId) {
      await this.updateEmployeeApplicationsCount(previousEmployee.marketingEmployeeId);
    }

    return trainee;
  }

  async getTraineesByMarketingEmployee(employeeId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [trainees, total] = await Promise.all([
      this.prisma.trainee.findMany({
        where: { marketingEmployeeId: employeeId },
        skip,
        take: limit,
        include: {
          program: {
            select: {
              id: true,
              nameAr: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.trainee.count({
        where: { marketingEmployeeId: employeeId },
      }),
    ]);

    return {
      data: trainees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getApplicationsByEmployee(employeeId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      this.prisma.marketingApplication.findMany({
        where: { employeeId },
        include: {
          employee: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.marketingApplication.count({
        where: { employeeId },
      }),
    ]);

    return {
      applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateApplication(id: number, data: UpdateMarketingApplicationDto) {
    try {
      return await this.prisma.marketingApplication.update({
        where: { id },
        data,
        include: {
          employee: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('التقديم غير موجود');
      }
      throw error;
    }
  }

  async deleteApplication(id: number) {
    try {
      const application = await this.prisma.marketingApplication.delete({
        where: { id },
      });

      // تحديث عدد التقديمات للموظف
      await this.updateEmployeeApplicationsCount(application.employeeId);

      return application;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('التقديم غير موجود');
      }
      throw error;
    }
  }

  // ==================== إحصائيات ====================

  async getEmployeeStats(employeeId: number, month?: number, year?: number) {
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const [target, applicationsCount, statusBreakdown] = await Promise.all([
      this.prisma.marketingTarget.findUnique({
        where: {
          employeeId_month_year: {
            employeeId,
            month: targetMonth,
            year: targetYear,
          },
        },
      }),
      this.prisma.marketingApplication.count({
        where: {
          employeeId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.marketingApplication.groupBy({
        by: ['status'],
        where: {
          employeeId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: true,
      }),
    ]);

    return {
      target: target?.targetAmount || 0,
      achieved: applicationsCount,
      percentage: target?.targetAmount ? Math.round((applicationsCount / target.targetAmount) * 100) : 0,
      statusBreakdown,
    };
  }

  private async updateEmployeeApplicationsCount(employeeId: number) {
    // حساب عدد المتدربين المُعيَّنين لهذا الموظف
    const count = await this.prisma.trainee.count({
      where: { marketingEmployeeId: employeeId },
    });

    await this.prisma.marketingEmployee.update({
      where: { id: employeeId },
      data: { totalApplications: count },
    });

    // تحديث الأهداف الشهرية
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // حساب عدد المتدربين المُعيَّنين في الشهر الحالي
    const monthlyCount = await this.prisma.trainee.count({
      where: {
        marketingEmployeeId: employeeId,
        createdAt: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1),
        },
      },
    });

    // تحديث الهدف الشهري إذا كان موجوداً
    await this.prisma.marketingTarget.updateMany({
      where: {
        employeeId: employeeId,
        month: currentMonth,
        year: currentYear,
      },
      data: {
        achievedAmount: monthlyCount,
      },
    });
  }

  // ==================== الإحصائيات ====================

  async getMarketingStats(month: number, year: number) {
    try {
      // تاريخ بداية ونهاية الشهر
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // إحصائيات عامة
      const totalEmployees = await this.prisma.marketingEmployee.count();
      const totalTrainees = await this.prisma.trainee.count();
      // المتدربين المخصصين = المتدربين الذين لهم تواصل أول
      const assignedTrainees = await this.prisma.trainee.count({
        where: { firstContactEmployeeId: { not: null } },
      });
      const unassignedTrainees = totalTrainees - assignedTrainees;

      // إحصائيات التواصل الأول (للتارجت)
      const firstContactTrainees = await this.prisma.trainee.count({
        where: { firstContactEmployeeId: { not: null } },
      });
      const unassignedFirstContact = totalTrainees - firstContactTrainees;

      // إحصائيات الشهر الحالي (المتدربين المضافين في هذا الشهر)
      const monthlyNewTrainees = await this.prisma.trainee.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // المتدربين المخصصين الشهريين = المتدربين الذين لهم تواصل أول في هذا الشهر
      const monthlyAssignedTrainees = await this.prisma.trainee.count({
        where: {
          firstContactEmployeeId: { not: null },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // إحصائيات التواصل الأول للشهر الحالي (هذا ما يحتسب في التارجت)
      const monthlyFirstContactTrainees = await this.prisma.trainee.count({
        where: {
          firstContactEmployeeId: { not: null },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // أداء الموظفين مع أهدافهم
      const employeePerformance = await this.prisma.marketingEmployee.findMany({
        select: {
          id: true,
          name: true,
          totalApplications: true,
          marketingTargets: {
            where: {
              month: month,
              year: year,
            },
            select: {
              targetAmount: true,
              achievedAmount: true,
            },
          },
          _count: {
            select: {
              trainees: {
                where: {
                  createdAt: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
              firstContactTrainees: {
                where: {
                  createdAt: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
            },
          },
        },
        orderBy: {
          totalApplications: 'desc',
        },
      });

      // تحويل البيانات لتنسيق مناسب للواجهة الأمامية
      const employeeStats = employeePerformance.map(employee => {
        const currentTarget = employee.marketingTargets[0]?.targetAmount || 0;
        const monthlyAssigned = employee._count.trainees;
        const monthlyFirstContact = employee._count.firstContactTrainees; // التواصل الأول (يحتسب في التارجت)

        return {
          id: employee.id,
          name: employee.name,
          monthlyTarget: currentTarget,
          totalAssigned: employee.totalApplications,
          monthlyAssigned: monthlyAssigned,
          monthlyFirstContact: monthlyFirstContact, // إضافة حقل جديد
          achievementRate: currentTarget > 0
            ? Math.round((monthlyFirstContact / currentTarget) * 100) // استخدام التواصل الأول بدلاً من التخصيص
            : 0,
        };
      });

      // إحصائيات حسب البرامج
      const programStats = await this.prisma.trainee.groupBy({
        by: ['programId'],
        where: {
          marketingEmployeeId: { not: null },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      });

      // جلب أسماء البرامج
      const programsWithNames = await Promise.all(
        programStats.map(async (stat) => {
          const program = await this.prisma.trainingProgram.findUnique({
            where: { id: stat.programId },
            select: { nameAr: true },
          });
          return {
            programId: stat.programId,
            programName: program?.nameAr || 'برنامج غير معروف',
            count: stat._count.id,
          };
        })
      );

      // Top 5 موظفين في الشهر الحالي (حسب التواصل الأول)
      const topPerformers = employeeStats
        .sort((a, b) => b.monthlyFirstContact - a.monthlyFirstContact)
        .slice(0, 5)
        .map((employee, index) => ({
          ...employee,
          rank: index + 1,
        }));

      // إحصائيات تفصيلية إضافية
      const detailedStats = {
        // توزيع المتدربين حسب الحالة
        statusDistribution: await this.getTraineeStatusDistribution(),

        // متوسط المتدربين لكل موظف
        averagePerEmployee: totalEmployees > 0
          ? Math.round(assignedTrainees / totalEmployees)
          : 0,

        // نسبة الموظفين النشطين (بناءً على التواصل الأول)
        activeEmployeesRate: totalEmployees > 0
          ? Math.round((employeeStats.filter(emp => emp.monthlyFirstContact > 0).length / totalEmployees) * 100)
          : 0,
      };

      return {
        overview: {
          totalEmployees,
          totalTrainees,
          assignedTrainees,
          unassignedTrainees,
          assignmentRate: totalTrainees > 0
            ? Math.round((assignedTrainees / totalTrainees) * 100)
            : 0,
          // إضافة إحصائيات التواصل الأول
          firstContactTrainees,
          unassignedFirstContact,
          firstContactRate: totalTrainees > 0
            ? Math.round((firstContactTrainees / totalTrainees) * 100)
            : 0,
        },
        monthly: {
          newTrainees: monthlyNewTrainees,
          assignedTrainees: monthlyAssignedTrainees,
          firstContactTrainees: monthlyFirstContactTrainees, // التواصل الأول للشهر
          assignmentRate: monthlyNewTrainees > 0
            ? Math.round((monthlyAssignedTrainees / monthlyNewTrainees) * 100)
            : 0,
          firstContactRate: monthlyNewTrainees > 0
            ? Math.round((monthlyFirstContactTrainees / monthlyNewTrainees) * 100)
            : 0,
        },
        employees: employeeStats,
        topPerformers,
        programs: programsWithNames,
        detailed: detailedStats,
        period: {
          month,
          year,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      };
    } catch (error) {
      console.error('Error getting marketing stats:', error);
      throw new Error('فشل في جلب إحصائيات التسويق');
    }
  }

  private async getTraineeStatusDistribution() {
    const statusCounts = await this.prisma.trainee.groupBy({
      by: ['traineeStatus'],
      _count: {
        id: true,
      },
    });

    return statusCounts.map(status => ({
      status: status.traineeStatus,
      count: status._count.id,
    }));
  }

  // ==================== إرسال إشعارات WhatsApp ====================

  /**
   * إرسال إشعار WhatsApp لموظف التسويق عند تعيين متدرب جديد له
   */
  private async sendMarketingEmployeeNotification(trainee: any, userId?: string) {
    try {
      if (!trainee.marketingEmployee?.phone) {
        console.log('No phone number for marketing employee');
        return false;
      }

      // جلب إحصائيات موظف التسويق للشهر الحالي
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      console.log(`🔄 Fetching stats for employee ${trainee.marketingEmployee.id}...`);
      const [monthlyStats, targetInfo, commissionStats] = await Promise.all([
        this.getEmployeeMonthlyStats(trainee.marketingEmployee.id, currentMonth, currentYear),
        this.getEmployeeTarget(trainee.marketingEmployee.id, currentMonth, currentYear),
        this.getEmployeeCommissionStats(trainee.marketingEmployee.id)
      ]);

      console.log(`📊 Stats fetched:`, {
        monthlyStats,
        targetInfo,
        commissionStats
      });

      // بناء رسالة الإشعار
      console.log(`📝 Building notification message...`);
      const message = await this.buildMarketingNotificationMessage(
        trainee,
        monthlyStats,
        targetInfo,
        commissionStats
      );
      console.log(`✅ Message built:`, message.substring(0, 200) + '...');

      // إرسال الرسالة
      const success = await this.whatsappService.sendMessage(
        trainee.marketingEmployee.phone,
        message,
        userId
      );

      // تسجيل العملية في Audit
      await this.auditService.log({
        action: AuditAction.CREATE,
        entity: 'WhatsApp',
        entityId: String(trainee.id),
        userId: userId || 'system',
        details: {
          message: success
            ? `Marketing notification sent to ${trainee.marketingEmployee.name}`
            : `Failed to send marketing notification to ${trainee.marketingEmployee.name}`,
          phoneNumber: trainee.marketingEmployee.phone,
          messageType: 'MARKETING_NOTIFICATION',
          traineeId: trainee.id,
          traineeName: trainee.nameAr,
          marketingEmployeeId: trainee.marketingEmployee.id,
          marketingEmployeeName: trainee.marketingEmployee.name,
        },
      });

      return success;
    } catch (error) {
      console.error('Error sending marketing employee notification:', error);
      return false;
    }
  }

  /**
   * جلب إحصائيات موظف التسويق للشهر الحالي (التواصل الأول)
   */
  private async getEmployeeMonthlyStats(employeeId: number, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // حساب التواصل الأول للشهر الحالي (هذا ما يحتسب في التارجت)
    const monthlyAssigned = await this.prisma.trainee.count({
      where: {
        firstContactEmployeeId: employeeId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      monthlyAssigned,
      month,
      year,
    };
  }

  /**
   * جلب معلومات الهدف الشهري لموظف التسويق
   */
  private async getEmployeeTarget(employeeId: number, month: number, year: number) {
    const target = await this.prisma.marketingTarget.findUnique({
      where: {
        employeeId_month_year: {
          employeeId,
          month,
          year,
        },
      },
    });

    // حساب الإنجاز الفعلي من قاعدة البيانات
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const achievedAmount = await this.prisma.trainee.count({
      where: {
        firstContactEmployeeId: employeeId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      targetAmount: target?.targetAmount || 0,
      achievedAmount: achievedAmount,
      hasTarget: !!target,
    };
  }

  /**
   * جلب إحصائيات العمولات لموظف التسويق
   */
  private async getEmployeeCommissionStats(employeeId: number) {
    try {
      console.log(`💰 Getting commission stats for employee ${employeeId}...`);
      
      // جلب جميع العمولات للموظف
      const [pendingCommissions, paidCommissions, totalAmount, pendingAmount, paidAmount] = await Promise.all([
        this.prisma.commission.count({
          where: {
            marketingEmployeeId: employeeId,
            status: 'PENDING'
          }
        }),
        this.prisma.commission.count({
          where: {
            marketingEmployeeId: employeeId,
            status: 'PAID'
          }
        }),
        this.prisma.commission.aggregate({
          where: { marketingEmployeeId: employeeId },
          _sum: { amount: true }
        }),
        this.prisma.commission.aggregate({
          where: { 
            marketingEmployeeId: employeeId,
            status: 'PENDING'
          },
          _sum: { amount: true }
        }),
        this.prisma.commission.aggregate({
          where: { 
            marketingEmployeeId: employeeId,
            status: 'PAID'
          },
          _sum: { amount: true }
        })
      ]);

      const stats = {
        pendingCommissions,
        paidCommissions,
        totalAmount: Number(totalAmount._sum.amount || 0),
        pendingAmount: Number(pendingAmount._sum.amount || 0),
        paidAmount: Number(paidAmount._sum.amount || 0),
      };
      return stats;
    } catch (error) {
      console.error(`❌ Error fetching commission stats for employee ${employeeId}:`, error);
      console.error('Error details:', error.message);
      return {
        pendingCommissions: 0,
        paidCommissions: 0,
        totalAmount: 0,
        pendingAmount: 0,
        paidAmount: 0,
      };
    }
  }

  /**
   * بناء رسالة الإشعار لموظف التسويق
   */
  private async buildMarketingNotificationMessage(
    trainee: any,
    monthlyStats: any,
    targetInfo: any,
    commissionStats?: any
  ): Promise<string> {
    const settings = await this.settingsService.getSettings();
    const centerName = settings?.centerName || 'مركز طيبة للتدريب المهني';

    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const arabicTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // حساب النسبة المئوية للإنجاز
    const achievementPercentage = targetInfo.targetAmount > 0
      ? Math.round((targetInfo.achievedAmount / targetInfo.targetAmount) * 100)
      : 0;

    // حساب المتبقي من الهدف
    const remainingTarget = Math.max(0, targetInfo.targetAmount - targetInfo.achievedAmount);

    // رسالة تهنئة أو تشجيع حسب الإنجاز
    let motivationMessage = '';
    if (achievementPercentage >= 100) {
      motivationMessage = '🎉 مبروك! لقد حققت هدفك الشهري وتجاوزته!';
    } else if (achievementPercentage >= 80) {
      motivationMessage = '🔥 ممتاز! أنت قريب جداً من تحقيق هدفك!';
    } else if (achievementPercentage >= 50) {
      motivationMessage = '💪 استمر! أنت في منتصف الطريق نحو هدفك!';
    } else {
      motivationMessage = '🚀 لنبدأ! لا يزال أمامك الكثير لتحقيق هدفك!';
    }

    // بناء قسم العمولات إذا كانت البيانات متوفرة
    let commissionSection = '';
    console.log('🔍 Building commission section, commissionStats:', commissionStats);
    console.log('🔍 Commission stats type:', typeof commissionStats);
    console.log('🔍 Commission stats truthy:', !!commissionStats);
    
    if (commissionStats && typeof commissionStats === 'object') {
      console.log('✅ Commission stats available, building section...');
      console.log('✅ Pending amount:', commissionStats.pendingAmount);
      console.log('✅ Paid amount:', commissionStats.paidAmount);
      console.log('✅ Total amount:', commissionStats.totalAmount);
      
      commissionSection = `
━━━━━━━━━━━━━━━━━━━━━━
💰 *رصيد العمولات:*
💳 الرصيد الموجود: ${(commissionStats.pendingAmount || 0).toFixed(2)} جنيه
✅ المسحوب: ${(commissionStats.paidAmount || 0).toFixed(2)} جنيه
📊 إجمالي العمولات: ${(commissionStats.totalAmount || 0).toFixed(2)} جنيه
📦 عمولات معلقة: ${commissionStats.pendingCommissions || 0}
🎯 عمولات مدفوعة: ${commissionStats.paidCommissions || 0}`;
      console.log('📝 Commission section built:', commissionSection);
    } else {
      console.log('❌ No commission stats available or invalid type');
    }

    return `📢 *إشعار تقديم تواصل جديد*

مرحباً ${trainee.marketingEmployee.name}! 👋

✅ تم تكليفك بالتواصل الأول مع متدرب جديد:
👤 *المتدرب:* ${trainee.nameAr}
📚 *البرنامج:* ${trainee.program?.nameAr || 'غير محدد'}
📅 *التاريخ:* ${arabicDate} - ${arabicTime}

━━━━━━━━━━━━━━━━━━━━━━
📊 *إحصائياتك الشهرية:*
🎯 الهدف الشهري: ${targetInfo.targetAmount} متدرب
✅ المحقق: ${targetInfo.achievedAmount} متدرب
📈 نسبة الإنجاز: ${achievementPercentage}%
⏳ المتبقي: ${remainingTarget} متدرب${commissionSection}

${motivationMessage}

━━━━━━━━━━━━━━━━━━━━━━
🏢 ${centerName}`;
  }

  // ==================== تحديث التواصل الأول والثاني ====================
  
  // دالة للتحقق من إمكانية تعديل التواصل (هل تم صرف العمولة أم لا)
  async canModifyContact(traineeId: number, contactType: 'FIRST_CONTACT' | 'SECOND_CONTACT', employeeId?: number): Promise<boolean> {
    try {
      console.log(`🔍 Checking modify permission for trainee ${traineeId}, contact type ${contactType}, employee ${employeeId}`);
      
      // البحث عن جميع العمولات المرتبطة بهذا المتدرب ونوع التواصل (بغض النظر عن الموظف)
      const commissions = await this.prisma.commission.findMany({
        where: {
          traineeId: traineeId,
          type: contactType,
        },
      });

      console.log(`📋 Found ${commissions.length} commissions for trainee ${traineeId}, type ${contactType}`);
      commissions.forEach(commission => {
        console.log(`   Commission ID: ${commission.id}, Status: ${commission.status}, Amount: ${commission.amount}, Employee: ${commission.marketingEmployeeId}`);
      });

      // إذا لم توجد عمولات، يمكن التعديل
      if (commissions.length === 0) {
        console.log(`✅ No commissions found - modification allowed`);
        return true;
      }

      // إذا وجدت عمولات، تحقق من أن جميعها لم يتم صرفها (PENDING)
      const hasPaidCommissions = commissions.some(commission => commission.status === 'PAID');
      
      const canModify = !hasPaidCommissions;
      console.log(`${canModify ? '✅' : '❌'} Can modify: ${canModify} (has paid commissions: ${hasPaidCommissions})`);
      
      return canModify; // يمكن التعديل فقط إذا لم يتم صرف أي عمولة
    } catch (error) {
      console.error('Error checking commission status:', error);
      return false; // في حالة الخطأ، منع التعديل للأمان
    }
  }
  
  async updateTraineeContact(traineeId: number, updateContactDto: UpdateTraineeContactDto, userId?: string) {
    try {
      // التحقق من وجود المتدرب
      const trainee = await this.prisma.trainee.findUnique({
        where: { id: traineeId },
        include: {
          firstContactEmployee: true,
          secondContactEmployee: true,
          marketingEmployee: true
        }
      });

      if (!trainee) {
        throw new NotFoundException('المتدرب غير موجود');
      }

      // التحقق من وجود موظفي التسويق المحددين
      if (updateContactDto.firstContactEmployeeId) {
        const firstContact = await this.prisma.marketingEmployee.findUnique({
          where: { id: updateContactDto.firstContactEmployeeId }
        });
        if (!firstContact) {
          throw new NotFoundException('موظف التواصل الأول غير موجود');
        }
      }

      if (updateContactDto.secondContactEmployeeId) {
        const secondContact = await this.prisma.marketingEmployee.findUnique({
          where: { id: updateContactDto.secondContactEmployeeId }
        });
        if (!secondContact) {
          throw new NotFoundException('موظف التواصل الثاني غير موجود');
        }
      }

      // تحديث بيانات التواصل
      const updatedTrainee = await this.prisma.trainee.update({
        where: { id: traineeId },
        data: {
          firstContactEmployeeId: updateContactDto.firstContactEmployeeId,
          secondContactEmployeeId: updateContactDto.secondContactEmployeeId,
        },
        include: {
          firstContactEmployee: true,
          secondContactEmployee: true,
          marketingEmployee: true,
          program: true
        }
      });

      // إرسال إشعارات WhatsApp للموظفين
      await this.sendContactNotifications(updatedTrainee, trainee);

      // تحديث الأهداف (التواصل الأول فقط يحتسب في التارجت)
      if (trainee.firstContactEmployeeId !== updateContactDto.firstContactEmployeeId) {
        // إضافة للموظف الجديد (إذا كان موجوداً)
        if (updateContactDto.firstContactEmployeeId) {
          await this.updateTargetAchievement(updateContactDto.firstContactEmployeeId, 1);
        }
        
        // طرح من الموظف القديم (إذا كان موجوداً)
        if (trainee.firstContactEmployeeId) {
          await this.updateTargetAchievement(trainee.firstContactEmployeeId, -1);
        }
      }

      // معالجة عمولة التواصل الأول
      if (trainee.firstContactEmployeeId !== updateContactDto.firstContactEmployeeId) {
        // حذف العمولة القديمة إذا كان هناك موظف سابق
        if (trainee.firstContactEmployeeId) {
          await this.deleteCommissionForContact(
            trainee.firstContactEmployeeId,
            traineeId,
            'FIRST_CONTACT',
            userId
          );
        }
        
        // إنشاء عمولة جديدة إذا تم تعيين موظف جديد
        if (updateContactDto.firstContactEmployeeId) {
          await this.createCommissionForContact(
            updateContactDto.firstContactEmployeeId,
            traineeId,
            'FIRST_CONTACT',
            userId
          );
        }
      }

      // معالجة عمولة التواصل الثاني
      if (trainee.secondContactEmployeeId !== updateContactDto.secondContactEmployeeId) {
        // حذف العمولة القديمة إذا كان هناك موظف سابق
        if (trainee.secondContactEmployeeId) {
          await this.deleteCommissionForContact(
            trainee.secondContactEmployeeId,
            traineeId,
            'SECOND_CONTACT',
            userId
          );
        }
        
        // إنشاء عمولة جديدة إذا تم تعيين موظف جديد
        if (updateContactDto.secondContactEmployeeId) {
          await this.createCommissionForContact(
            updateContactDto.secondContactEmployeeId,
            traineeId,
            'SECOND_CONTACT',
            userId
          );
        }
      }

      // تسجيل في سجل المراجعة
      await this.auditService.log({
        action: AuditAction.UPDATE,
        entity: 'TraineeContact',
        entityId: traineeId.toString(),
        details: { message: `تحديث التواصل للمتدرب: ${trainee.nameAr}` },
        userId: userId || 'system',
      });

      return {
        message: 'تم تحديث التواصل بنجاح',
        trainee: updatedTrainee
      };

    } catch (error) {
      console.error('Error updating trainee contact:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('فشل في تحديث التواصل');
    }
  }

  // دالة لإنشاء عمولة للتواصل
  private async createCommissionForContact(
    marketingEmployeeId: number,
    traineeId: number,
    type: 'FIRST_CONTACT' | 'SECOND_CONTACT',
    userId?: string
  ) {
    try {
      // إنشاء العمولة مع قيمة افتراضية (يمكن تعديلها لاحقاً)
      await this.commissionsService.createCommission({
        marketingEmployeeId,
        traineeId,
        type,
        amount: 0, // قيمة افتراضية، يجب تحديدها من الواجهة
        description: `عمولة ${type === 'FIRST_CONTACT' ? 'تواصل أول' : 'تواصل ثاني'} - تحتاج تحديد القيمة`,
      }, userId);

      console.log(`Commission created for trainee ${traineeId}, type ${type}, employee ${marketingEmployeeId}`);
    } catch (error) {
      console.error('Error creating commission for contact:', error);
      // لا نرمي الخطأ هنا حتى لا نؤثر على العملية الأساسية
    }
  }

  // دالة لحذف عمولة التواصل
  private async deleteCommissionForContact(
    marketingEmployeeId: number,
    traineeId: number,
    type: 'FIRST_CONTACT' | 'SECOND_CONTACT',
    userId?: string
  ) {
    try {
      // البحث عن العمولة المطلوب حذفها
      const commission = await this.prisma.commission.findFirst({
        where: {
          marketingEmployeeId,
          traineeId,
          type,
          status: 'PENDING' // فقط العمولات غير المصروفة يمكن حذفها
        }
      });

      if (commission) {
        await this.commissionsService.deleteCommission(commission.id, userId);
        console.log(`Commission deleted for trainee ${traineeId}, type ${type}, employee ${marketingEmployeeId}`);
      } else {
        console.log(`No pending commission found to delete for trainee ${traineeId}, type ${type}, employee ${marketingEmployeeId}`);
      }
    } catch (error) {
      console.error('Error deleting commission for contact:', error);
      // لا نرمي الخطأ هنا حتى لا نؤثر على العملية الأساسية
    }
  }

  // دالة لإرسال إشعارات التواصل
  private async sendContactNotifications(updatedTrainee: any, originalTrainee: any) {
    try {
      const settings = await this.settingsService.getSettings();
      const centerName = settings?.centerName || 'مركز التدريب';

      // إشعار التواصل الأول مع الإحصائيات
      console.log(`🔍 Checking first contact notification...`);
      console.log(`Original first contact: ${originalTrainee.firstContactEmployeeId}, New: ${updatedTrainee.firstContactEmployeeId}`);
      
      if (updatedTrainee.firstContactEmployee && 
          originalTrainee.firstContactEmployeeId !== updatedTrainee.firstContactEmployeeId) {
        console.log(`📱 Sending first contact notification to ${updatedTrainee.firstContactEmployee.name}`);
        
        // جلب إحصائيات موظف التسويق للشهر الحالي
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const [monthlyStats, targetInfo] = await Promise.all([
          this.getEmployeeMonthlyStats(updatedTrainee.firstContactEmployee.id, currentMonth, currentYear),
          this.getEmployeeTarget(updatedTrainee.firstContactEmployee.id, currentMonth, currentYear)
        ]);

        // بناء رسالة الإشعار مع الإحصائيات
        const firstContactMessage = await this.buildContactNotificationMessage(
          updatedTrainee,
          monthlyStats,
          targetInfo,
          'first'
        );

        await this.whatsappService.sendMessage(
          updatedTrainee.firstContactEmployee.phone,
          firstContactMessage
        );
      }

      // إشعار التواصل الثاني مع الإحصائيات
      console.log(`🔍 Checking second contact notification...`);
      console.log(`Original second contact: ${originalTrainee.secondContactEmployeeId}, New: ${updatedTrainee.secondContactEmployeeId}`);
      
      if (updatedTrainee.secondContactEmployee && 
          originalTrainee.secondContactEmployeeId !== updatedTrainee.secondContactEmployeeId) {
        console.log(`📱 Sending second contact notification to ${updatedTrainee.secondContactEmployee.name}`);
        
        // جلب إحصائيات موظف التسويق للشهر الحالي
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const [monthlyStats, targetInfo] = await Promise.all([
          this.getEmployeeMonthlyStats(updatedTrainee.secondContactEmployee.id, currentMonth, currentYear),
          this.getEmployeeTarget(updatedTrainee.secondContactEmployee.id, currentMonth, currentYear)
        ]);

        // بناء رسالة الإشعار مع الإحصائيات
        const secondContactMessage = await this.buildContactNotificationMessage(
          updatedTrainee,
          monthlyStats,
          targetInfo,
          'second'
        );

        await this.whatsappService.sendMessage(
          updatedTrainee.secondContactEmployee.phone,
          secondContactMessage
        );
      }

    } catch (error) {
      console.error('Error sending contact notifications:', error);
      // لا نرمي خطأ هنا لعدم إيقاف العملية الأساسية
    }
  }

  /**
   * بناء رسالة الإشعار للتواصل الأول أو الثاني
   */
  private async buildContactNotificationMessage(
    trainee: any,
    monthlyStats: any,
    targetInfo: any,
    contactType: 'first' | 'second'
  ): Promise<string> {
    const settings = await this.settingsService.getSettings();
    const centerName = settings?.centerName || 'مركز طيبة للتدريب المهني';

    const now = new Date();
    const arabicDate = now.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const arabicTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const employeeName = contactType === 'first' 
      ? trainee.firstContactEmployee.name 
      : trainee.secondContactEmployee.name;

    if (contactType === 'first') {
      // حساب النسبة المئوية للإنجاز
      const achievementPercentage = targetInfo.targetAmount > 0
        ? Math.round((targetInfo.achievedAmount / targetInfo.targetAmount) * 100)
        : 0;

      // حساب المتبقي من الهدف
      const remainingTarget = Math.max(0, targetInfo.targetAmount - targetInfo.achievedAmount);

      // رسالة تهنئة أو تشجيع حسب الإنجاز
      let motivationMessage = '';
      if (achievementPercentage >= 100) {
        motivationMessage = '🎉 مبروك! لقد حققت هدفك الشهري وتجاوزته!';
      } else if (achievementPercentage >= 80) {
        motivationMessage = '🔥 ممتاز! أنت قريب جداً من تحقيق هدفك!';
      } else if (achievementPercentage >= 50) {
        motivationMessage = '💪 استمر! أنت في منتصف الطريق نحو هدفك!';
      } else {
        motivationMessage = '🚀 لنبدأ! لا يزال أمامك الكثير لتحقيق هدفك!';
      }

      return `📢 *إشعار تقديم جديد*
مرحباً ${employeeName}! 👋
✅ مبروك جالك تقديم جديد
👤 *المتدرب:* ${trainee.nameAr}
🎓 *البرنامج:* ${trainee.program?.nameAr || 'غير محدد'}
📅 *التاريخ:* ${arabicDate} - ${arabicTime}
🔄 *الحالة:* تواصل أول
✅ *يحتسب في التارجت:* نعم
━━━━━━━━━━━━━━━━━━━━━━
📊 *إحصائياتك الشهرية:*
🎯 الهدف الشهري: ${targetInfo.targetAmount} متدرب
✅ المحقق: ${targetInfo.achievedAmount} متدرب
📈 نسبة الإنجاز: ${achievementPercentage}%
⏳ المتبقي: ${remainingTarget} متدرب

${motivationMessage}
━━━━━━━━━━━━━━━━━━━━━━
🏢 ${centerName}`;
    }

    if (contactType === 'second') {
      // حساب النسبة المئوية للإنجاز (بناءً على التواصل الأول)
      const achievementPercentage = targetInfo.targetAmount > 0
        ? Math.round((targetInfo.achievedAmount / targetInfo.targetAmount) * 100)
        : 0;

      // حساب المتبقي من الهدف
      const remainingTarget = Math.max(0, targetInfo.targetAmount - targetInfo.achievedAmount);

      // رسالة تهنئة أو تشجيع حسب الإنجاز
      let motivationMessage = '';
      if (achievementPercentage >= 100) {
        motivationMessage = '🎉 مبروك! لقد حققت هدفك الشهري وتجاوزته!';
      } else if (achievementPercentage >= 80) {
        motivationMessage = '🔥 ممتاز! أنت قريب جداً من تحقيق هدفك!';
      } else if (achievementPercentage >= 50) {
        motivationMessage = '💪 استمر! أنت في منتصف الطريق نحو هدفك!';
      } else {
        motivationMessage = '🚀 لنبدأ! لا يزال أمامك الكثير لتحقيق هدفك!';
      }

      return `📢 *إشعار تقديم جديد*
مرحباً ${employeeName}! 👋
✅ مبروك جالك تقديم جديد
👤 *المتدرب:* ${trainee.nameAr}
📱 *الهاتف:* ${trainee.phone}
🎓 *البرنامج:* ${trainee.program?.nameAr || 'غير محدد'}
📅 *التاريخ:* ${arabicDate} - ${arabicTime}
🔄 *الحالة:* تواصل ثاني
❌ *يحتسب في التارجت:* لا
━━━━━━━━━━━━━━━━━━━━━━
📊 *إحصائياتك الشهرية:*
🎯 الهدف الشهري: ${targetInfo.targetAmount} متدرب
✅ المحقق: ${targetInfo.achievedAmount} متدرب
📈 نسبة الإنجاز: ${achievementPercentage}%
⏳ المتبقي: ${remainingTarget} متدرب

${motivationMessage}
━━━━━━━━━━━━━━━━━━━━━━
🏢 ${centerName}`;
    }

    return '';
  }

  // دالة لتحديث إنجاز الهدف
  private async updateTargetAchievement(employeeId: number, change: number) {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      await this.prisma.marketingTarget.upsert({
        where: {
          employeeId_month_year: {
            employeeId,
            month: currentMonth,
            year: currentYear,
          },
        },
        update: {
          achievedAmount: {
            increment: change,
          },
        },
        create: {
          employeeId,
          month: currentMonth,
          year: currentYear,
          targetAmount: 0,
          achievedAmount: Math.max(0, change),
        },
      });
    } catch (error) {
      console.error('Error updating target achievement:', error);
    }
  }
}
