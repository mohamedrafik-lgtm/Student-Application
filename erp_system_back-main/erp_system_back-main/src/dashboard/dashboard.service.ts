import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TraineeStatus, AuditAction } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import * as v8 from 'v8';
import { SystemHealthResponseDto } from './dto/system-health.dto';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private whatsappService: UnifiedWhatsAppService,
  ) {}

  async getDashboardStats() {
    // احصائيات المتدربين
    const totalTrainees = await this.prisma.trainee.count();
    const newTraineesThisMonth = await this.prisma.trainee.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });
    const lastMonthTrainees = await this.prisma.trainee.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    // احصائيات البرامج
    const totalPrograms = await this.prisma.trainingProgram.count();
    const activePrograms = await this.prisma.trainingProgram.count({
      where: {
        trainees: {
          some: {
            traineeStatus: {
              in: [TraineeStatus.NEW, TraineeStatus.CURRENT],
            },
          },
        },
      },
    });

    // حساب نسبة الحضور
    const totalSessions = await this.prisma.session.count({
      where: {
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });
    const totalAttendanceRecords = await this.prisma.attendanceRecord.count({
      where: {
        session: {
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      },
    });
    const presentRecords = await this.prisma.attendanceRecord.count({
      where: {
        status: 'PRESENT',
        session: {
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      },
    });

    const attendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100)
      : 0;

    // حساب الإيرادات الشهرية
    const monthlyRevenue = await this.prisma.traineePayment.aggregate({
      _sum: {
        paidAmount: true,
      },
      where: {
        paidAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        status: 'PAID',
      },
    });

    const lastMonthRevenue = await this.prisma.traineePayment.aggregate({
      _sum: {
        paidAmount: true,
      },
      where: {
        paidAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        status: 'PAID',
      },
    });

    // حساب نسب التغيير
    const traineesChange = lastMonthTrainees > 0 
      ? Math.round(((newTraineesThisMonth - lastMonthTrainees) / lastMonthTrainees) * 100)
      : newTraineesThisMonth > 0 ? 100 : 0;

    const revenueChange = lastMonthRevenue._sum.paidAmount && lastMonthRevenue._sum.paidAmount > 0
      ? Math.round((((monthlyRevenue._sum.paidAmount || 0) - lastMonthRevenue._sum.paidAmount) / lastMonthRevenue._sum.paidAmount) * 100)
      : (monthlyRevenue._sum.paidAmount || 0) > 0 ? 100 : 0;

    return {
      totalTrainees,
      traineesChange,
      activePrograms,
      programsChange: 0, // يمكن حساب هذا لاحقاً
      attendanceRate,
      attendanceChange: 0, // يمكن حساب هذا لاحقاً
      monthlyRevenue: monthlyRevenue._sum.paidAmount || 0,
      revenueChange,
    };
  }

  async getDashboardCharts() {
    // توزيع المتدربين حسب البرنامج
    const traineesByProgram = await this.prisma.trainingProgram.findMany({
      select: {
        nameAr: true,
        _count: {
          select: {
            trainees: true,
          },
        },
      },
    });

    // توزيع المتدربين حسب الحالة
    const traineesByStatus = await this.prisma.trainee.groupBy({
      by: ['traineeStatus'],
      _count: {
        traineeStatus: true,
      },
    });

    // إحصائيات الحضور الشهرية
    const monthlyAttendance = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      where: {
        session: {
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      },
    });

    return {
      traineesByProgram: traineesByProgram.map(program => ({
        name: program.nameAr,
        value: program._count.trainees,
      })),
      traineesByStatus: traineesByStatus.map(status => ({
        name: this.getStatusName(status.traineeStatus),
        value: status._count.traineeStatus,
      })),
      monthlyAttendance: monthlyAttendance.map(attendance => ({
        name: this.getAttendanceStatusName(attendance.status),
        value: attendance._count.status,
      })),
    };
  }

  async getDashboardActivities() {
    // آخر 10 أنشطة من سجل التدقيق
    const activities = await this.prisma.auditLog.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return activities.map(activity => ({
      time: this.getRelativeTime(activity.createdAt),
      title: this.getActivityTitle(activity.action, activity.entity),
      description: this.getActivityDescription(activity),
      color: this.getActivityColor(activity.action),
      status: 'success',
    }));
  }

  private getStatusName(status: TraineeStatus): string {
    const statusNames = {
      [TraineeStatus.NEW]: 'مستجد',
      [TraineeStatus.CURRENT]: 'مستمر',
      [TraineeStatus.GRADUATE]: 'خريج',
      [TraineeStatus.WITHDRAWN]: 'منسحب',
    };
    return statusNames[status] || status;
  }

  private getAttendanceStatusName(status: string): string {
    const statusNames = {
      PRESENT: 'حاضر',
      ABSENT: 'غائب',
      LATE: 'متأخر',
      EXCUSED: 'غياب بعذر',
    };
    return statusNames[status] || status;
  }

  private getActivityTitle(action: AuditAction, entity: string): string {
    const actionNames = {
      [AuditAction.CREATE]: 'إنشاء',
      [AuditAction.UPDATE]: 'تحديث',
      [AuditAction.DELETE]: 'حذف',
      [AuditAction.LOGIN_SUCCESS]: 'تسجيل دخول',
      [AuditAction.LOGIN_FAILURE]: 'فشل تسجيل دخول',
    };

    const entityNames = {
      Trainee: 'متدرب',
      TrainingProgram: 'برنامج تدريبي',
      User: 'مستخدم',
      News: 'خبر',
      Job: 'وظيفة',
    };

    return `${actionNames[action] || action} ${entityNames[entity] || entity}`;
  }

  private getActivityDescription(activity: any): string {
    if (activity.details && typeof activity.details === 'object' && activity.details.message) {
      return activity.details.message;
    }
    return `تم ${this.getActivityTitle(activity.action, activity.entity)} بواسطة ${activity.user?.name || 'مستخدم'}`;
  }

  private getActivityColor(action: AuditAction): string {
    const colorMap = {
      [AuditAction.CREATE]: 'success',
      [AuditAction.UPDATE]: 'primary',
      [AuditAction.DELETE]: 'error',
      [AuditAction.LOGIN_SUCCESS]: 'success',
      [AuditAction.LOGIN_FAILURE]: 'error',
    };
    return colorMap[action] || 'primary';
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return 'الآن';
    } else if (diffInMinutes < 60) {
      return `منذ ${diffInMinutes} دقيقة`;
    } else if (diffInHours < 24) {
      return `منذ ${diffInHours} ساعة`;
    } else {
      return `منذ ${diffInDays} يوم`;
    }
  }

  async getComprehensiveDashboard() {
   try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // ============ إحصائيات المتدربين ============
    const [
      totalTrainees,
      activeTrainees,
      newTraineesToday,
      newTraineesThisMonth,
      newTraineesLastMonth,
      traineesByStatus,
    ] = await Promise.all([
      this.prisma.trainee.count().catch(() => 0),
      this.prisma.trainee.count({
        where: { traineeStatus: { in: ['NEW', 'CURRENT'] } },
      }).catch(() => 0),
      this.prisma.trainee.count({
        where: { createdAt: { gte: startOfToday } },
      }).catch(() => 0),
      this.prisma.trainee.count({
        where: { createdAt: { gte: startOfMonth } },
      }).catch(() => 0),
      this.prisma.trainee.count({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      }).catch(() => 0),
      this.prisma.trainee.groupBy({
        by: ['traineeStatus'],
        _count: { traineeStatus: true },
      }).catch(() => []),
    ]);

    // ============ إحصائيات البرامج ============
    const [totalPrograms, programsWithTrainees] = await Promise.all([
      this.prisma.trainingProgram.count().catch(() => 0),
      this.prisma.trainingProgram.findMany({
        select: {
          id: true,
          nameAr: true,
          _count: { select: { trainees: true } },
        },
        orderBy: { trainees: { _count: 'desc' } },
        take: 10,
      }).catch(() => []),
    ]);

    // ============ الإحصائيات المالية ============
    const [
      monthlyRevenue,
      lastMonthRevenue,
      todayRevenue,
      totalUnpaid,
      recentPayments,
      monthlyExpenseTransfers,
      lastMonthExpenseTransfers,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { createdAt: { gte: startOfMonth }, type: { in: ['PAYMENT', 'DEPOSIT'] } },
      }).catch(() => ({ _sum: { amount: null }, _count: 0 })),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth }, type: { in: ['PAYMENT', 'DEPOSIT'] } },
      }).catch(() => ({ _sum: { amount: null } })),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { createdAt: { gte: startOfToday }, type: { in: ['PAYMENT', 'DEPOSIT'] } },
      }).catch(() => ({ _sum: { amount: null }, _count: 0 })),
      this.prisma.traineePayment.aggregate({
        _sum: { amount: true, paidAmount: true },
        where: { status: { in: ['PENDING', 'PARTIALLY_PAID'] } },
      }).catch(() => ({ _sum: { amount: null, paidAmount: null } })),
      this.prisma.traineePayment.findMany({
        where: { status: 'PAID' },
        orderBy: { paidAt: 'desc' },
        take: 5,
        include: {
          trainee: { select: { nameAr: true } },
          fee: {
            select: { program: { select: { nameAr: true } } },
          },
        },
      }).catch(() => []),
      // مصروفات هذا الشهر (تحويلات من خزينة دخل إلى خزينة مصروفات)
      this.prisma.transaction.findMany({
        where: { createdAt: { gte: startOfMonth }, type: 'TRANSFER' },
        include: {
          sourceSafe: { select: { category: true } },
          targetSafe: { select: { category: true } },
        },
      }).catch(() => []),
      // مصروفات الشهر الماضي
      this.prisma.transaction.findMany({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth }, type: 'TRANSFER' },
        include: {
          sourceSafe: { select: { category: true } },
          targetSafe: { select: { category: true } },
        },
      }).catch(() => []),
    ]);

    // حساب المصروفات (تحويلات من INCOME إلى EXPENSE)
    const monthlyExpenses = monthlyExpenseTransfers
      .filter(t => t.sourceSafe?.category === 'INCOME' && t.targetSafe?.category === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const lastMonthExpenses = lastMonthExpenseTransfers
      .filter(t => t.sourceSafe?.category === 'INCOME' && t.targetSafe?.category === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    // ============ إحصائيات الحضور هذا الشهر ============
    const [attendanceTotal, attendancePresent, attendanceLate, attendanceAbsent] = await Promise.all([
      this.prisma.attendanceRecord.count({
        where: { session: { date: { gte: startOfMonth } } },
      }).catch(() => 0),
      this.prisma.attendanceRecord.count({
        where: { status: 'PRESENT', session: { date: { gte: startOfMonth } } },
      }).catch(() => 0),
      this.prisma.attendanceRecord.count({
        where: { status: 'LATE', session: { date: { gte: startOfMonth } } },
      }).catch(() => 0),
      this.prisma.attendanceRecord.count({
        where: { status: 'ABSENT', session: { date: { gte: startOfMonth } } },
      }).catch(() => 0),
    ]);

    // ============ تقديمات التسويق ============
    const [
      totalApplications,
      newApplicationsToday,
      newApplicationsThisMonth,
      applicationsByStatus,
    ] = await Promise.all([
      this.prisma.marketingApplication.count().catch(() => 0),
      this.prisma.marketingApplication.count({
        where: { createdAt: { gte: startOfToday } },
      }).catch(() => 0),
      this.prisma.marketingApplication.count({
        where: { createdAt: { gte: startOfMonth } },
      }).catch(() => 0),
      this.prisma.marketingApplication.groupBy({
        by: ['status'],
        _count: { status: true },
      }).catch(() => []),
    ]);

    // ============ إيرادات الـ 6 أشهر الأخيرة ============
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthlyRevenueHistory: any[] = [];
    const monthlyNewTrainees: any[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const [rev, expenses, count] = await Promise.all([
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { createdAt: { gte: monthStart, lte: monthEnd }, type: { in: ['PAYMENT', 'DEPOSIT'] } },
        }).catch(() => ({ _sum: { amount: null } })),
        this.prisma.transaction.findMany({
          where: { createdAt: { gte: monthStart, lte: monthEnd }, type: 'TRANSFER' },
          include: {
            sourceSafe: { select: { category: true } },
            targetSafe: { select: { category: true } },
          },
        }).catch(() => []),
        this.prisma.trainee.count({
          where: { createdAt: { gte: monthStart, lte: monthEnd } },
        }).catch(() => 0),
      ]);

      const monthExpenses = expenses
        .filter(t => t.sourceSafe?.category === 'INCOME' && t.targetSafe?.category === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyRevenueHistory.push({
        month: monthNames[monthStart.getMonth()],
        revenue: rev._sum.amount || 0,
        expenses: monthExpenses,
        net: (rev._sum.amount || 0) - monthExpenses,
      });
      monthlyNewTrainees.push({
        month: monthNames[monthStart.getMonth()],
        count,
      });
    }

    // ============ محاضرات اليوم حسب البرنامج ============
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const todaySessions = await this.prisma.scheduledSession.findMany({
      where: {
        date: { gte: startOfToday, lte: endOfToday },
        isCancelled: false,
      },
      include: {
        scheduleSlot: {
          include: {
            content: {
              select: { name: true, program: { select: { id: true, nameAr: true } } },
            },
          },
        },
        attendance: {
          select: { status: true },
        },
      },
      orderBy: { date: 'asc' },
    }).catch(() => [] as any[]);

    // تجميع المحاضرات حسب البرنامج
    const programSessionsMap = new Map<number, {
      programName: string;
      sessions: Array<{
        id: number;
        title: string;
        type: string;
        startTime: string;
        endTime: string;
        location: string | null;
        present: number;
        absent: number;
        late: number;
        excused: number;
        total: number;
        attendanceRate: number;
      }>;
      totalPresent: number;
      totalAbsent: number;
      totalLate: number;
      totalExcused: number;
      totalRecords: number;
      overallAttendanceRate: number;
    }>();

    for (const session of todaySessions) {
      const slot = session.scheduleSlot;
      const programId = slot?.content?.program?.id;
      const programName = slot?.content?.program?.nameAr || 'غير محدد';
      if (!programId) continue;

      const present = session.attendance.filter(r => r.status === 'PRESENT').length;
      const absent = session.attendance.filter(r => r.status === 'ABSENT').length;
      const late = session.attendance.filter(r => r.status === 'LATE').length;
      const excused = session.attendance.filter(r => r.status === 'EXCUSED').length;
      const total = session.attendance.length;
      const attendRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      // Title from content name + slot type
      const contentName = slot?.content?.name || 'محاضرة';
      const sessionTitle = `${contentName} (${slot?.startTime || ''} - ${slot?.endTime || ''})`;

      if (!programSessionsMap.has(programId)) {
        programSessionsMap.set(programId, {
          programName,
          sessions: [],
          totalPresent: 0,
          totalAbsent: 0,
          totalLate: 0,
          totalExcused: 0,
          totalRecords: 0,
          overallAttendanceRate: 0,
        });
      }

      const pg = programSessionsMap.get(programId)!;
      pg.sessions.push({
        id: session.id,
        title: sessionTitle,
        type: slot?.type || 'THEORETICAL',
        startTime: slot?.startTime || '',
        endTime: slot?.endTime || '',
        location: slot?.location || null,
        present,
        absent,
        late,
        excused,
        total,
        attendanceRate: attendRate,
      });
      pg.totalPresent += present;
      pg.totalAbsent += absent;
      pg.totalLate += late;
      pg.totalExcused += excused;
      pg.totalRecords += total;
    }

    // حساب نسبة الحضور الإجمالية لكل برنامج
    for (const pg of programSessionsMap.values()) {
      pg.overallAttendanceRate = pg.totalRecords > 0
        ? Math.round(((pg.totalPresent + pg.totalLate) / pg.totalRecords) * 100)
        : 0;
    }

    const todaySessionsByProgram = Array.from(programSessionsMap.entries()).map(([programId, data]) => ({
      programId,
      ...data,
    }));

    // ============ آخر الأنشطة ============
    const recentActivities = await this.prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    }).catch(() => [] as any[]);

    // ============ حساب التغييرات ============
    const traineesChangePercent = newTraineesLastMonth > 0
      ? Math.round(((newTraineesThisMonth - newTraineesLastMonth) / newTraineesLastMonth) * 100)
      : newTraineesThisMonth > 0 ? 100 : 0;

    const revenueChangePercent = (lastMonthRevenue._sum.amount || 0) > 0
      ? Math.round((((monthlyRevenue._sum.amount || 0) - (lastMonthRevenue._sum.amount || 0)) / (lastMonthRevenue._sum.amount || 1)) * 100)
      : (monthlyRevenue._sum.amount || 0) > 0 ? 100 : 0;

    const expensesChangePercent = lastMonthExpenses > 0
      ? Math.round(((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)
      : monthlyExpenses > 0 ? 100 : 0;

    const attendanceRate = attendanceTotal > 0
      ? Math.round((attendancePresent / attendanceTotal) * 100)
      : 0;

    return {
      stats: {
        totalTrainees,
        activeTrainees,
        newTraineesToday,
        newTraineesThisMonth,
        traineesChangePercent,
        totalPrograms,
        activePrograms: programsWithTrainees.filter(p => p._count.trainees > 0).length,
        attendanceRate,
        attendancePresent,
        attendanceAbsent,
        attendanceLate,
        attendanceTotal,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        monthlyExpenses: monthlyExpenses,
        monthlyNetIncome: (monthlyRevenue._sum.amount || 0) - monthlyExpenses,
        monthlyPaymentsCount: monthlyRevenue._count || 0,
        todayRevenue: todayRevenue._sum.amount || 0,
        todayPaymentsCount: todayRevenue._count || 0,
        revenueChangePercent,
        expensesChangePercent,
        totalUnpaid: Math.max(0, (totalUnpaid._sum.amount || 0) - (totalUnpaid._sum.paidAmount || 0)),
        totalApplications,
        newApplicationsToday,
        newApplicationsThisMonth,
      },
      charts: {
        traineesByStatus: traineesByStatus.map(s => ({
          name: this.getStatusName(s.traineeStatus),
          value: s._count.traineeStatus,
          status: s.traineeStatus,
        })),
        traineesByProgram: programsWithTrainees.map(p => ({
          name: p.nameAr,
          value: p._count.trainees,
        })),
        monthlyRevenueHistory,
        monthlyNewTrainees,
        attendanceBreakdown: [
          { name: 'حاضر', value: attendancePresent, color: '#10b981' },
          { name: 'غائب', value: attendanceAbsent, color: '#ef4444' },
          { name: 'متأخر', value: attendanceLate, color: '#f59e0b' },
        ],
        applicationsByStatus: (applicationsByStatus || []).map((a: any) => ({
          name: this.getApplicationStatusName(a.status),
          value: a._count.status,
        })),
      },
      todaySessionsByProgram,
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        amount: p.paidAmount,
        date: p.paidAt,
        traineeName: (p as any).trainee?.nameAr || 'غير محدد',
        programName: (p as any).fee?.program?.nameAr || 'غير محدد',
        method: p.notes || 'نقدي',
      })),
      recentActivities: recentActivities.map(a => ({
        id: a.id,
        time: this.getRelativeTime(a.createdAt),
        title: this.getActivityTitle(a.action, a.entity),
        description: this.getActivityDescription(a),
        color: this.getActivityColor(a.action),
        userName: a.user?.name || 'مستخدم',
        action: a.action,
        createdAt: a.createdAt,
      })),
    };
   } catch (error: any) {
    console.error('getComprehensiveDashboard critical error:', error?.message || error);
    return {
      stats: {
        totalTrainees: 0, activeTrainees: 0, newTraineesToday: 0,
        newTraineesThisMonth: 0, traineesChangePercent: 0, totalPrograms: 0,
        activePrograms: 0, attendanceRate: 0, attendancePresent: 0,
        attendanceAbsent: 0, attendanceLate: 0, attendanceTotal: 0,
        monthlyRevenue: 0, monthlyExpenses: 0, monthlyNetIncome: 0,
        monthlyPaymentsCount: 0, todayRevenue: 0, todayPaymentsCount: 0,
        revenueChangePercent: 0, expensesChangePercent: 0, totalUnpaid: 0,
        totalApplications: 0, newApplicationsToday: 0, newApplicationsThisMonth: 0,
      },
      charts: {
        traineesByStatus: [], traineesByProgram: [],
        monthlyRevenueHistory: [], monthlyNewTrainees: [],
        attendanceBreakdown: [], applicationsByStatus: [],
      },
      todaySessionsByProgram: [],
      recentPayments: [],
      recentActivities: [],
    };
   }
  }

  private getApplicationStatusName(status: string): string {
    const names: Record<string, string> = {
      NEW: 'جديد',
      CONTACTED: 'تم التواصل',
      INTERESTED: 'مهتم',
      REGISTERED: 'مسجل',
      NOT_INTERESTED: 'غير مهتم',
      CANCELLED: 'ملغي',
    };
    return names[status] || status;
  }

  async getSystemHealth(): Promise<SystemHealthResponseDto> {
    const startTime = Date.now();
    
    // فحص قاعدة البيانات
    const databaseHealth = await this.checkDatabaseHealth();
    
    // فحص Redis
    const redisHealth = await this.checkRedisHealth();
    
    // فحص Cloudinary
    const cloudinaryHealth = await this.checkCloudinaryHealth();
    
    // فحص WhatsApp
    const whatsappHealth = await this.checkWhatsAppHealth();
    
    // معلومات موارد النظام
    const resources = this.getSystemResources();
    
    // حالة النظام العامة
    const healthy = 
      databaseHealth.connected && 
      redisHealth.connected && 
      cloudinaryHealth.connected;
    
    return {
      healthy,
      timestamp: new Date(),
      database: databaseHealth,
      redis: redisHealth,
      cloudinary: cloudinaryHealth,
      whatsapp: whatsappHealth,
      resources,
    };
  }

  private async checkDatabaseHealth() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      
      return {
        connected: true,
        responseTime,
        type: 'MySQL',
      };
    } catch (error) {
      return {
        connected: false,
        responseTime: Date.now() - start,
        type: 'MySQL',
      };
    }
  }

  private async checkRedisHealth() {
    try {
      // محاولة الاتصال بـ Redis
      const { default: Redis } = await import('ioredis');
      const redis = new Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        lazyConnect: true,
        connectTimeout: 3000,
      });

      const start = Date.now();
      await redis.connect();
      await redis.ping();
      const responseTime = Date.now() - start;
      
      await redis.quit();

      return {
        connected: true,
        responseTime,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  private async checkCloudinaryHealth() {
    try {
      const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
      const apiKey = this.configService.get('CLOUDINARY_API_KEY');
      const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

      if (!cloudName || !apiKey || !apiSecret) {
        return {
          connected: false,
          error: 'Cloudinary credentials not configured',
        };
      }

      return {
        connected: true,
        cloudName,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  private async checkWhatsAppHealth() {
    try {
      // الحصول على حالة الواتساب
      const status = await this.whatsappService.getStatus();
      
      // الحصول على عدد الجلسات إذا كان يستخدم Database storage
      let sessionsCount: number | undefined;
      const storageType = this.configService.get('WHATSAPP_STORAGE_TYPE', 'file');
      
      if (storageType === 'database') {
        sessionsCount = await this.prisma.whatsAppSession.count();
      }
      
      return {
        connected: status.isConnected,
        ready: status.isReady,
        phoneNumber: status.phoneNumber,
        storageType,
        sessionsCount,
      };
    } catch (error) {
      return {
        connected: false,
        ready: false,
        storageType: this.configService.get('WHATSAPP_STORAGE_TYPE', 'file'),
      };
    }
  }

  private getSystemResources() {
    // معلومات الذاكرة
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);
    
    // معلومات Node.js heap
    const heapStats = v8.getHeapStatistics();
    const heapUsed = heapStats.used_heap_size;
    const heapTotal = heapStats.total_heap_size;
    
    // معلومات CPU
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const cpuUsagePercent = Math.round(100 - (100 * totalIdle / totalTick));
    
    return {
      memoryUsagePercent,
      memoryUsedMB: Math.round(usedMemory / 1024 / 1024),
      memoryTotalMB: Math.round(totalMemory / 1024 / 1024),
      cpuUsagePercent,
      uptimeSeconds: Math.round(os.uptime()),
      platform: `${os.type()} ${os.release()}`,
      nodeVersion: process.version,
    };
  }
}
