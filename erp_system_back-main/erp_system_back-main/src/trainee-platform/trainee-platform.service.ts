import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionTrackingService } from '../trainee-auth/session-tracking.service';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';
import { SettingsService } from '../settings/settings.service';
import * as bcrypt from 'bcryptjs';
import { 
  UpdateTraineeAccountDto, 
  TraineeAccountQueryDto, 
  ResetTraineePasswordDto,
  TraineePlatformStatsQueryDto 
} from './dto/trainee-platform.dto';

@Injectable()
export class TraineePlatformService {
  constructor(
    private prisma: PrismaService,
    private sessionTrackingService: SessionTrackingService,
    private whatsappService: UnifiedWhatsAppService,
    private settingsService: SettingsService
  ) {}

  /**
   * جلب قائمة حسابات المتدربين مع إمكانية البحث والفلترة
   */
  async getTraineeAccounts(query: TraineeAccountQueryDto) {
    const {
      search,
      isActive,
      programId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100); // حد أقصى 100 عنصر

    // بناء شروط البحث
    const where: any = {};

    if (search) {
      where.OR = [
        {
          trainee: {
            OR: [
              { nameAr: { contains: search } },
              { nameEn: { contains: search } },
              { nationalId: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ]
          }
        },
        { nationalId: { contains: search } }
      ];
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (programId) {
      where.trainee = {
        ...where.trainee,
        programId: Number(programId)
      };
    }

    // جلب البيانات مع العدد الكلي
    const [traineeAccounts, total] = await Promise.all([
      this.prisma.traineeAuth.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          trainee: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              nationalId: true,
              email: true,
              phone: true,
              photoUrl: true,
              program: {
                select: {
                  id: true,
                  nameAr: true,
                  nameEn: true,
                }
              },
              traineeStatus: true,
              classLevel: true,
              academicYear: true,
            }
          }
        }
      }),
      this.prisma.traineeAuth.count({ where })
    ]);

    return {
      data: traineeAccounts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      }
    };
  }

  /**
   * جلب حساب متدرب واحد بالتفصيل
   */
  async getTraineeAccountById(id: string) {
    const traineeAccount = await this.prisma.traineeAuth.findUnique({
      where: { id },
      include: {
        trainee: {
          include: {
            program: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
              }
            },
          }
        }
      }
    });

    if (!traineeAccount) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    return traineeAccount;
  }

  /**
   * جلب كلمة مرور حساب متدرب
   */
  async getTraineePassword(id: string) {
    const traineeAccount = await this.prisma.traineeAuth.findUnique({
      where: { id },
      select: {
        id: true,
        password: true,
      }
    });

    if (!traineeAccount) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    return {
      hasPassword: !!traineeAccount.password,
      message: 'كلمة المرور مشفرة ولا يمكن عرضها'
    };
  }

  /**
   * تحديث حساب متدرب
   */
  async updateTraineeAccount(id: string, updateData: UpdateTraineeAccountDto) {
    const traineeAccount = await this.prisma.traineeAuth.findUnique({
      where: { id }
    });

    if (!traineeAccount) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    const updatePayload: any = {};

    // تحديث كلمة المرور إذا تم توفيرها
    if (updateData.password) {
      updatePayload.password = await bcrypt.hash(updateData.password, 12);
    }

    // تحديث حالة التفعيل
    if (typeof updateData.isActive === 'boolean') {
      updatePayload.isActive = updateData.isActive;
    }

    // إضافة تاريخ التحديث
    updatePayload.updatedAt = new Date();

    return this.prisma.traineeAuth.update({
      where: { id },
      data: updatePayload,
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            nationalId: true,
            email: true,
            phone: true,
          }
        }
      }
    });
  }

  /**
   * إعادة تعيين كلمة مرور متدرب
   */
  async resetTraineePassword(id: string, resetData: ResetTraineePasswordDto) {
    const traineeAccount = await this.prisma.traineeAuth.findUnique({
      where: { id }
    });

    if (!traineeAccount) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    const hashedPassword = await bcrypt.hash(resetData.newPassword, 12);

    return this.prisma.traineeAuth.update({
      where: { id },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpiresAt: null,
        resetCodeGeneratedAt: null,
        updatedAt: new Date(),
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            nationalId: true,
          }
        }
      }
    });
  }

  /**
   * تفعيل أو تعطيل حساب متدرب
   */
  async toggleTraineeAccountStatus(id: string) {
    const traineeAccount = await this.prisma.traineeAuth.findUnique({
      where: { id },
      select: { isActive: true }
    });

    if (!traineeAccount) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    return this.prisma.traineeAuth.update({
      where: { id },
      data: {
        isActive: !traineeAccount.isActive,
        updatedAt: new Date(),
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            nationalId: true,
          }
        }
      }
    });
  }

  /**
   * جلب إحصائيات منصة المتدربين الاحترافية
   */
  async getTraineePlatformStats(query: TraineePlatformStatsQueryDto) {
    try {
      // استخدام SessionTrackingService للحصول على إحصائيات شاملة
      const overallStats = await this.sessionTrackingService.getOverallStats();

      // 1. الإحصائيات الأساسية للحسابات
      const [totalAccounts, activeAccounts, totalTrainees] = await Promise.all([
        this.prisma.traineeAuth.count(),
        this.prisma.traineeAuth.count({ where: { isActive: true } }),
        this.prisma.trainee.count()
      ]);

      const inactiveAccounts = totalAccounts - activeAccounts;
      const registeredTrainees = totalAccounts;
      const unregisteredTrainees = totalTrainees - registeredTrainees;

      // 2. إحصائيات البرامج التدريبية
      const programsStats = await this.prisma.trainingProgram.findMany({
        include: {
          _count: {
            select: {
              trainees: {
                where: {
                  traineeAuth: {
                    isNot: null
                  }
                }
              }
            }
          }
        }
      });

      // 3. أحدث جلسات التدريب (جلسات نشطة وجلسات منتهية حديثاً)
      const recentSessions = await this.prisma.traineeSession.findMany({
        where: {
          OR: [
            { isActive: false, logoutAt: { not: null } }, // جلسات منتهية
            { isActive: true } // جلسات نشطة حالياً
          ]
        },
        select: {
          id: true,
          loginAt: true,
          logoutAt: true,
          duration: true,
          device: true,
          traineeAuth: {
            select: {
              trainee: {
                select: {
                  nameAr: true,
                  program: {
                    select: {
                      nameAr: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { logoutAt: 'desc' },
        take: 10
      });

      // 4. نشاط الجلسات اليومي (آخر 7 أيام)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const dailySessions = await this.prisma.traineeSession.findMany({
        where: {
          loginAt: {
            gte: sevenDaysAgo
          }
        },
        select: {
          loginAt: true,
          duration: true,
          traineeAuthId: true
        }
      });

      // تجميع البيانات اليومية
      const loginsByDate: { [key: string]: { count: number; uniqueUsers: Set<string>; totalTime: number } } = {};

      // إنشاء مصفوفة آخر 7 أيام
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        loginsByDate[dateKey] = { count: 0, uniqueUsers: new Set(), totalTime: 0 };
      }

      // تجميع البيانات
      dailySessions.forEach(session => {
        const dateKey = session.loginAt.toISOString().split('T')[0];
        if (loginsByDate[dateKey]) {
          loginsByDate[dateKey].count++;
          loginsByDate[dateKey].uniqueUsers.add(session.traineeAuthId);
          loginsByDate[dateKey].totalTime += session.duration || 0;
        }
      });

      // تحويل إلى المصفوفة المطلوبة
      const loginActivity = Object.entries(loginsByDate).map(([date, data]) => ({
        date,
        count: data.count,
        uniqueUsers: data.uniqueUsers.size,
        totalTime: data.totalTime,
        averageTime: data.count > 0 ? Math.floor(data.totalTime / data.count) : 0
      }));

      // 5. أكثر الأنشطة شيوعاً
      const topActivities = await this.prisma.traineeActivity.groupBy({
        by: ['activityType'],
        _count: {
          activityType: true
        },
        orderBy: {
          _count: {
            activityType: 'desc'
          }
        },
        take: 5
      });

      // 6. إحصائيات الأجهزة
      const deviceStats = await this.prisma.traineeSession.groupBy({
        by: ['device'],
        _count: {
          device: true
        },
        where: {
          device: { not: null }
        }
      });

      return {
        overview: {
          totalAccounts,
          activeAccounts,
          inactiveAccounts,
          registeredTrainees,
          unregisteredTrainees,
          // إضافة إحصائيات من SessionTrackingService
          totalSessions: overallStats.totalSessions,
          totalTimeSpent: overallStats.totalTimeSpent,
          averageSessionTime: overallStats.averageSessionTime,
          activeToday: overallStats.activeToday,
          activeThisWeek: overallStats.activeThisWeek,
          activeThisMonth: overallStats.activeThisMonth,
        },
        loginActivity,
        programsStats: programsStats.map(program => ({
          id: program.id,
          nameAr: program.nameAr,
          traineeCount: program._count.trainees
        })),
        recentActivity: recentSessions.map(session => ({
          id: session.id,
          loginAt: session.loginAt,
          logoutAt: session.logoutAt,
          duration: session.duration,
          device: session.device,
          trainee: session.traineeAuth.trainee
        })),
        topActivities: topActivities.map(activity => ({
          type: activity.activityType,
          count: activity._count.activityType
        })),
        deviceStats: deviceStats.map(device => ({
          device: device.device,
          count: device._count.device
        }))
      };

    } catch (error) {
      console.error('Error fetching trainee platform stats:', error);
      throw error;
    }
  }

  /**
   * إنهاء الجلسات المنتهية الصلاحية وإعادة حساب المتوسطات
   */
  async expireInactiveSessions() {
    return this.sessionTrackingService.expireInactiveSessions();
  }

  /**
   * فحص حالة الجلسات للتشخيص
   */
  async debugSessions() {
    try {
      const [
        totalSessions,
        activeSessions,
        completedSessions,
        sessionsWithDuration,
        traineeStats,
        sampleSessions
      ] = await Promise.all([
        this.prisma.traineeSession.count(),
        this.prisma.traineeSession.count({ where: { isActive: true } }),
        this.prisma.traineeSession.count({ where: { isActive: false } }),
        this.prisma.traineeSession.count({ 
          where: { 
            duration: { not: null, gt: 0 } 
          } 
        }),
        this.prisma.traineeStats.findMany({
          select: {
            traineeAuthId: true,
            totalSessions: true,
            totalTimeSpent: true,
            averageSessionTime: true
          }
        }),
        this.prisma.traineeSession.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            loginAt: true,
            logoutAt: true,
            duration: true,
            isActive: true,
            traineeAuth: {
              select: {
                trainee: {
                  select: {
                    nameAr: true
                  }
                }
              }
            }
          }
        })
      ]);

      return {
        summary: {
          totalSessions,
          activeSessions,
          completedSessions,
          sessionsWithDuration,
          traineeStatsCount: traineeStats.length
        },
        traineeStats,
        sampleSessions,
        issues: {
          noSessions: totalSessions === 0,
          noCompletedSessions: completedSessions === 0,
          noSessionsWithDuration: sessionsWithDuration === 0,
          allSessionsActive: activeSessions === totalSessions && totalSessions > 0
        }
      };
    } catch (error) {
      console.error('Error in debug sessions:', error);
      return { error: error.message };
    }
  }

  /**
   * جلب آخر نشاط تسجيل دخول للمتدربين
   */
  async getRecentLoginActivity(limit: number = 20) {
    return this.prisma.traineeAuth.findMany({
      where: {
        lastLoginAt: { not: null }
      },
      orderBy: { lastLoginAt: 'desc' },
      take: limit,
      select: {
        id: true,
        lastLoginAt: true,
        trainee: {
          select: {
            nameAr: true,
            nameEn: true,
            nationalId: true,
            program: {
              select: {
                nameAr: true,
                nameEn: true,
              }
            }
          }
        }
      }
    });
  }

  /**
   * إرسال رسالة واتساب للمتدرب ببيانات تسجيل الدخول للمنصة
   */
  async sendPlatformCredentials(accountId: string, userId?: string): Promise<{ success: boolean; message: string }> {
    try {
      // جلب بيانات الحساب
      const account = await this.prisma.traineeAuth.findUnique({
        where: { id: accountId },
        include: {
          trainee: {
            include: {
              program: true
            }
          }
        }
      });

      if (!account) {
        throw new NotFoundException('حساب المتدرب غير موجود');
      }

      if (!account.trainee?.phone) {
        throw new BadRequestException('رقم هاتف المتدرب غير متوفر');
      }

      if (!account.isActive) {
        throw new BadRequestException('الحساب غير مفعل. يجب تفعيل الحساب أولاً');
      }

      // التحقق من جاهزية الواتساب
      const isReady = await this.whatsappService.isClientReallyReady();
      if (!isReady) {
        throw new BadRequestException('خدمة الواتساب غير متاحة حالياً. يرجى المحاولة لاحقاً');
      }

      // استخدام الرقم القومي ككلمة مرور
      const newPassword = account.trainee.nationalId;
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // تحديث كلمة المرور في قاعدة البيانات
      await this.prisma.traineeAuth.update({
        where: { id: accountId },
        data: { password: hashedPassword }
      });

      // بناء رسالة البيانات
      const message = await this.buildPlatformCredentialsMessage(account, newPassword);

      // إرسال الرسالة
      const success = await this.whatsappService.sendMessage(
        account.trainee.phone,
        message,
        userId
      );

      if (!success) {
        throw new BadRequestException('فشل إرسال الرسالة. يرجى التأكد من رقم الهاتف');
      }

      return {
        success: true,
        message: `تم إرسال بيانات المنصة بنجاح إلى ${account.trainee.nameAr}`
      };
    } catch (error) {
      console.error('خطأ في إرسال بيانات المنصة:', error);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('حدث خطأ أثناء إرسال الرسالة');
    }
  }

  /**
   * بناء رسالة بيانات تسجيل الدخول للمنصة
   */
  private async buildPlatformCredentialsMessage(account: any, password: string): Promise<string> {
    const trainee = account.trainee;
    const settings = await this.settingsService.getSettings();
    
    // الرسالة المختصرة
    let message = `🎓 *${trainee.nameAr}*\n\n`;
    message += `بيانات تسجيل الدخول للمنصة:\n\n`;
    message += `👤 اسم المستخدم: *${trainee.nationalId}*\n`;
    message += `🔐 كلمة المرور: *${trainee.nationalId}*\n\n`;
    message += `💡 كلمة المرور هي نفس الرقم القومي\n`;
    message += `⚠️ يرجى حفظ البيانات في مكان آمن\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `${settings?.centerName || 'نظام إدارة التدريب'}`;

    return message;
  }
}
