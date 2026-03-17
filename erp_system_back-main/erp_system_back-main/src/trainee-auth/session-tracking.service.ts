import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class SessionTrackingService {
  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء جلسة جديدة عند تسجيل الدخول
   */
  async createSession(traineeAuthId: string, req: Request) {
    console.log('📝 Creating session for trainee:', traineeAuthId);
    
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // إنهاء أي جلسات نشطة سابقة للمتدرب
    try {
      await this.endActiveSessions(traineeAuthId);
      console.log('✅ Previous sessions ended');
    } catch (error) {
      console.error('❌ Error ending previous sessions:', error);
    }
    
    // استخراج معلومات الجهاز والمتصفح
    const userAgent = req.headers?.['user-agent'] || req.get?.('user-agent') || 'Unknown';
    const ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
    
    const device = this.detectDevice(userAgent);
    
    console.log('🔍 Session details:', { userAgent, ipAddress, device });
    
    // إنشاء الجلسة الجديدة
    try {
      const session = await this.prisma.traineeSession.create({
        data: {
          traineeAuthId,
          sessionToken,
          ipAddress,
          userAgent,
          device,
          loginAt: new Date(),
          isActive: true,
        },
      });

      console.log('✅ Session created successfully:', session.id);

      // تحديث إحصائيات المتدرب
      try {
        await this.updateTraineeStats(traineeAuthId, 'login');
        console.log('✅ Stats updated');
      } catch (error) {
        console.error('❌ Error updating stats:', error);
      }

      return session;
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }

  /**
   * إنهاء جلسة عند تسجيل الخروج
   */
  async endSession(sessionToken: string) {
    const session = await this.prisma.traineeSession.findUnique({
      where: { sessionToken },
    });

    if (!session || !session.isActive) {
      return null;
    }

    const logoutAt = new Date();
    const duration = Math.floor((logoutAt.getTime() - session.loginAt.getTime()) / 1000);

    const updatedSession = await this.prisma.traineeSession.update({
      where: { sessionToken },
      data: {
        logoutAt,
        duration,
        isActive: false,
      },
    });

    // تحديث إحصائيات المتدرب
    await this.updateTraineeStats(session.traineeAuthId, 'logout', duration);

    return updatedSession;
  }

  /**
   * إنهاء كافة الجلسات النشطة للمتدرب
   */
  async endActiveSessions(traineeAuthId: string) {
    const activeSessions = await this.prisma.traineeSession.findMany({
      where: {
        traineeAuthId,
        isActive: true,
      },
    });

    for (const session of activeSessions) {
      const logoutAt = new Date();
      const duration = Math.floor((logoutAt.getTime() - session.loginAt.getTime()) / 1000);

      await this.prisma.traineeSession.update({
        where: { id: session.id },
        data: {
          logoutAt,
          duration,
          isActive: false,
        },
      });
    }
  }

  /**
   * تسجيل نشاط للمتدرب
   */
  async trackActivity(
    sessionToken: string,
    activityType: string,
    page?: string,
    action?: string,
    metadata?: any
  ) {
    const session = await this.prisma.traineeSession.findUnique({
      where: { sessionToken },
    });

    if (!session || !session.isActive) {
      return null;
    }

    return this.prisma.traineeActivity.create({
      data: {
        sessionId: session.id,
        activityType: activityType as any,
        page,
        action,
        metadata,
        timestamp: new Date(),
      },
    });
  }

  /**
   * تحديث إحصائيات المتدرب
   */
  private async updateTraineeStats(
    traineeAuthId: string,
    action: 'login' | 'logout' | 'activity',
    sessionDuration?: number
  ) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // جلب أو إنشاء إحصائيات المتدرب
    let stats = await this.prisma.traineeStats.findUnique({
      where: { traineeAuthId },
    });

    if (!stats) {
      stats = await this.prisma.traineeStats.create({
        data: {
          traineeAuthId,
          firstLogin: now,
          lastLogin: now,
          lastActivity: now,
          totalSessions: 1,
          thisWeekSessions: 1,
          thisMonthSessions: 1,
        },
      });
    } else {
      const updateData: any = {
        lastActivity: now,
      };

      if (action === 'login') {
        updateData.totalSessions = { increment: 1 };
        updateData.lastLogin = now;
        
        // عد جلسات هذا الأسبوع
        const weekSessions = await this.prisma.traineeSession.count({
          where: {
            traineeAuthId,
            loginAt: { gte: startOfWeek },
          },
        });
        updateData.thisWeekSessions = weekSessions;

        // عد جلسات هذا الشهر
        const monthSessions = await this.prisma.traineeSession.count({
          where: {
            traineeAuthId,
            loginAt: { gte: startOfMonth },
          },
        });
        updateData.thisMonthSessions = monthSessions;
      }

      if (action === 'activity') {
        // فقط تحديث آخر نشاط
        updateData.lastActivity = now;
      }

      if (sessionDuration && action === 'logout') {
        updateData.totalTimeSpent = { increment: sessionDuration };
        
        // حساب متوسط مدة الجلسة
        const completedSessions = await this.prisma.traineeSession.findMany({
          where: {
            traineeAuthId,
            isActive: false,
            duration: { not: null },
          },
          select: { duration: true },
        });

        if (completedSessions.length > 0) {
          const totalDuration = completedSessions.reduce(
            (sum, session) => sum + (session.duration || 0),
            0
          );
          updateData.averageSessionTime = Math.floor(totalDuration / completedSessions.length);
        }

        // أطول جلسة
        if (!stats.longestSession || sessionDuration > stats.longestSession) {
          updateData.longestSession = sessionDuration;
        }
      }

      stats = await this.prisma.traineeStats.update({
        where: { traineeAuthId },
        data: updateData,
      });
    }

    return stats;
  }

  /**
   * كشف نوع الجهاز من User Agent
   */
  private detectDevice(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }

  /**
   * جلب إحصائيات متقدمة للمتدرب
   */
  async getAdvancedStats(traineeAuthId: string) {
    const stats = await this.prisma.traineeStats.findUnique({
      where: { traineeAuthId },
    });

    if (!stats) {
      return null;
    }

    // آخر 7 جلسات
    const recentSessions = await this.prisma.traineeSession.findMany({
      where: { traineeAuthId },
      orderBy: { loginAt: 'desc' },
      take: 7,
      select: {
        loginAt: true,
        logoutAt: true,
        duration: true,
        device: true,
        activities: {
          select: {
            activityType: true,
            timestamp: true,
          },
        },
      },
    });

    // أنشطة المتدرب حسب النوع
    const activityCounts = await this.prisma.traineeActivity.groupBy({
      by: ['activityType'],
      where: {
        session: {
          traineeAuthId,
        },
      },
      _count: {
        activityType: true,
      },
    });

    // أنشطة آخر 30 يوم
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyActivity = await this.prisma.traineeSession.findMany({
      where: {
        traineeAuthId,
        loginAt: { gte: thirtyDaysAgo },
      },
      select: {
        loginAt: true,
        duration: true,
      },
    });

    // تجميع النشاط اليومي
    const dailyStats: { [key: string]: { sessions: number; totalTime: number } } = {};
    
    dailyActivity.forEach((session) => {
      const date = session.loginAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { sessions: 0, totalTime: 0 };
      }
      dailyStats[date].sessions++;
      dailyStats[date].totalTime += session.duration || 0;
    });

    return {
      stats,
      recentSessions,
      activityCounts,
      dailyStats,
    };
  }

  /**
   * تحديث نشاط الجلسة (heartbeat)
   */
  async updateSessionActivity(sessionToken: string) {
    const session = await this.prisma.traineeSession.findUnique({
      where: { sessionToken },
    });

    if (!session || !session.isActive) {
      return null;
    }

    // تحديث آخر نشاط للجلسة
    await this.prisma.traineeSession.update({
      where: { sessionToken },
      data: {
        updatedAt: new Date(),
      },
    });

    // تحديث آخر نشاط للإحصائيات
    await this.updateTraineeStats(session.traineeAuthId, 'activity');

    return { message: 'تم تحديث نشاط الجلسة', timestamp: new Date() };
  }

  /**
   * إنهاء الجلسات المنتهية الصلاحية (أكثر من 30 دقيقة بدون نشاط)
   */
  async expireInactiveSessions() {
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    const inactiveSessions = await this.prisma.traineeSession.findMany({
      where: {
        isActive: true,
        updatedAt: {
          lt: thirtyMinutesAgo,
        },
      },
    });

    for (const session of inactiveSessions) {
      const duration = Math.floor((new Date().getTime() - session.loginAt.getTime()) / 1000);
      
      await this.prisma.traineeSession.update({
        where: { id: session.id },
        data: {
          logoutAt: new Date(),
          duration,
          isActive: false,
        },
      });

      // تحديث الإحصائيات
      await this.updateTraineeStats(session.traineeAuthId, 'logout', duration);
    }

    return { expiredSessions: inactiveSessions.length };
  }

  /**
   * جلب إحصائيات شاملة لكافة المتدربين
   */
  async getOverallStats() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalTrainees,
      activeToday,
      activeThisWeek,
      activeThisMonth,
      totalSessions,
      totalTimeSpent,
      averageSessionTime,
    ] = await Promise.all([
      this.prisma.traineeStats.count(),
      this.prisma.traineeSession.groupBy({
        by: ['traineeAuthId'],
        where: {
          loginAt: { gte: startOfDay },
        },
      }).then(groups => groups.length),
      this.prisma.traineeSession.groupBy({
        by: ['traineeAuthId'],
        where: {
          loginAt: { gte: startOfWeek },
        },
      }).then(groups => groups.length),
      this.prisma.traineeSession.groupBy({
        by: ['traineeAuthId'],
        where: {
          loginAt: { gte: startOfMonth },
        },
      }).then(groups => groups.length),
      this.prisma.traineeSession.count(),
      this.prisma.traineeStats.aggregate({
        _sum: { totalTimeSpent: true },
      }),
      this.prisma.traineeStats.aggregate({
        _avg: { averageSessionTime: true },
      }),
    ]);

    return {
      totalTrainees,
      activeToday,
      activeThisWeek,
      activeThisMonth,
      totalSessions,
      totalTimeSpent: totalTimeSpent._sum.totalTimeSpent || 0,
      averageSessionTime: Math.floor(averageSessionTime._avg.averageSessionTime || 0),
    };
  }
}
