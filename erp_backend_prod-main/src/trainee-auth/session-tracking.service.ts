import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
import * as crypto from 'crypto';

// مدة الـ heartbeat بالثواني (60 ثانية = دقيقة واحدة)
const HEARTBEAT_INTERVAL = 60;
// مهلة انتهاء الجلسة بالدقائق (دقيقتان بدون heartbeat = offline)
const SESSION_EXPIRE_MINUTES = 2;

@Injectable()
export class SessionTrackingService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // إنشاء وإنهاء الجلسات
  // ============================================================

  /**
   * إنشاء جلسة تتبع جديدة عند تسجيل الدخول
   */
  async createSession(traineeAuthId: string, req: Request) {
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // إنهاء الجلسات النشطة السابقة
    await this.endActiveTrackingSessions(traineeAuthId, 'NEW_SESSION');

    // استخراج معلومات الجهاز
    const userAgent = req.headers?.['user-agent'] || req.get?.('user-agent') || 'Unknown';
    const ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';

    const { device, browser, os } = this.parseUserAgent(userAgent);

    // إنشاء جلسة في الجدول القديم (للتوافقية)
    let oldSession: any = null;
    try {
      oldSession = await this.prisma.traineeSession.create({
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
    } catch (e) {
      console.error('Error creating old session:', e);
    }

    // إنشاء جلسة التتبع الجديدة
    const trackingSession = await this.prisma.traineeTrackingSession.create({
      data: {
        traineeAuthId,
        sessionToken,
        ipAddress,
        userAgent,
        device,
        browser,
        os,
        loginAt: new Date(),
        lastHeartbeatAt: new Date(),
        isActive: true,
        activeSeconds: 0,
      },
    });

    // تحديث إحصائيات قديمة
    try {
      await this.updateTraineeStats(traineeAuthId, 'login');
    } catch (e) { /* ignore */ }

    return { ...trackingSession, sessionToken };
  }

  /**
   * إنهاء جلسة عند تسجيل الخروج
   */
  async endSession(sessionToken: string) {
    // إنهاء الجلسة الجديدة
    const session = await this.prisma.traineeTrackingSession.findUnique({
      where: { sessionToken },
    });

    if (session && session.isActive) {
      await this.prisma.traineeTrackingSession.update({
        where: { sessionToken },
        data: {
          isActive: false,
          logoutAt: new Date(),
          logoutType: 'MANUAL',
        },
      });
    }

    // إنهاء الجلسة القديمة
    try {
      const oldSession = await this.prisma.traineeSession.findUnique({
        where: { sessionToken },
      });
      if (oldSession && oldSession.isActive) {
        const duration = Math.floor((Date.now() - oldSession.loginAt.getTime()) / 1000);
        await this.prisma.traineeSession.update({
          where: { sessionToken },
          data: { logoutAt: new Date(), duration, isActive: false },
        });
        await this.updateTraineeStats(oldSession.traineeAuthId, 'logout', duration);
      }
    } catch (e) { /* ignore */ }

    return session;
  }

  /**
   * إنهاء كافة جلسات التتبع النشطة للمتدرب
   */
  private async endActiveTrackingSessions(traineeAuthId: string, logoutType: string) {
    const activeSessions = await this.prisma.traineeTrackingSession.findMany({
      where: { traineeAuthId, isActive: true },
    });

    for (const session of activeSessions) {
      await this.prisma.traineeTrackingSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          logoutAt: new Date(),
          logoutType,
        },
      });
    }

    // إنهاء الجلسات القديمة أيضاً
    try {
      await this.endActiveSessions(traineeAuthId);
    } catch (e) { /* ignore */ }
  }

  // ============================================================
  // Heartbeat - نبضات التتبع (الدقة الفعلية)
  // ============================================================

  /**
   * استقبال نبضة من المتدرب - تُثبت أنه أونلاين لمدة 60 ثانية
   */
  async heartbeat(sessionToken: string, page?: string) {
    const session = await this.prisma.traineeTrackingSession.findUnique({
      where: { sessionToken },
    });

    if (!session || !session.isActive) {
      return null;
    }

    const now = new Date();

    // تسجيل النبضة
    await this.prisma.traineeHeartbeat.create({
      data: {
        sessionId: session.id,
        page: page || session.currentPage,
        timestamp: now,
      },
    });

    // تحديث الجلسة
    await this.prisma.traineeTrackingSession.update({
      where: { id: session.id },
      data: {
        lastHeartbeatAt: now,
        activeSeconds: { increment: HEARTBEAT_INTERVAL },
        currentPage: page || session.currentPage,
      },
    });

    // تسجيل زيارة صفحة جديدة إذا تغيرت
    if (page && page !== session.currentPage) {
      // إغلاق الصفحة السابقة
      if (session.currentPage) {
        const lastVisit = await this.prisma.traineePageVisit.findFirst({
          where: { sessionId: session.id, page: session.currentPage, leftAt: null },
          orderBy: { enteredAt: 'desc' },
        });
        if (lastVisit) {
          const duration = Math.floor((now.getTime() - lastVisit.enteredAt.getTime()) / 1000);
          await this.prisma.traineePageVisit.update({
            where: { id: lastVisit.id },
            data: { leftAt: now, duration },
          });
        }
      }
      // فتح صفحة جديدة
      await this.prisma.traineePageVisit.create({
        data: {
          sessionId: session.id,
          page,
          enteredAt: now,
        },
      });
    }

    return { ok: true, activeSeconds: session.activeSeconds + HEARTBEAT_INTERVAL };
  }

  // ============================================================
  // إنهاء الجلسات المنتهية - Cron
  // ============================================================

  /**
   * إنهاء الجلسات التي لم تَرِد منها نبضات لأكثر من دقيقتين
   */
  async expireInactiveSessions() {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - SESSION_EXPIRE_MINUTES);

    // الجلسات الجديدة
    const expired = await this.prisma.traineeTrackingSession.findMany({
      where: { isActive: true, lastHeartbeatAt: { lt: cutoff } },
    });

    for (const session of expired) {
      await this.prisma.traineeTrackingSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          logoutAt: session.lastHeartbeatAt, // آخر نبضة هي وقت الخروج الفعلي
          logoutType: 'EXPIRED',
        },
      });
    }

    // الجلسات القديمة
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    const oldExpired = await this.prisma.traineeSession.findMany({
      where: { isActive: true, updatedAt: { lt: thirtyMinutesAgo } },
    });

    for (const session of oldExpired) {
      const duration = Math.floor((Date.now() - session.loginAt.getTime()) / 1000);
      await this.prisma.traineeSession.update({
        where: { id: session.id },
        data: { logoutAt: new Date(), duration, isActive: false },
      });
      try {
        await this.updateTraineeStats(session.traineeAuthId, 'logout', duration);
      } catch (e) { /* ignore */ }
    }

    return { expiredSessions: expired.length + oldExpired.length };
  }

  // ============================================================
  // إحصائيات التتبع الجديدة الشاملة
  // ============================================================

  /**
   * بيانات التتبع الشاملة للوحة الإدارة
   */
  async getTrackingDashboard(filters: { programId?: number; search?: string }) {
    const { programId, search } = filters;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // فلتر البرنامج والبحث
    const traineeFilter: any = {};
    if (programId) traineeFilter.programId = Number(programId);
    if (search) {
      traineeFilter.OR = [
        { nameAr: { contains: search } },
        { nameEn: { contains: search } },
        { nationalId: { contains: search } },
      ];
    }

    const hasTraineeFilter = programId || search;
    const sessionWhere = hasTraineeFilter
      ? { traineeAuth: { trainee: traineeFilter } }
      : {};
    const activeSessionWhere = { ...sessionWhere, isActive: true };

    // 1. المتصلون الآن
    const onlineNow = await this.prisma.traineeTrackingSession.findMany({
      where: activeSessionWhere,
      select: {
        id: true,
        sessionToken: true,
        loginAt: true,
        lastHeartbeatAt: true,
        activeSeconds: true,
        device: true,
        browser: true,
        os: true,
        ipAddress: true,
        currentPage: true,
        traineeAuth: {
          select: {
            id: true,
            trainee: {
              select: {
                id: true,
                nameAr: true,
                nationalId: true,
                photoUrl: true,
                program: { select: { id: true, nameAr: true } },
              },
            },
          },
        },
      },
      orderBy: { lastHeartbeatAt: 'desc' },
    });

    // 2. ملخص الإحصائيات
    const programFilter = programId ? { programId: Number(programId) } : {};
    const [
      totalOnline,
      activeTodayCount,
      activeWeekCount,
      activeMonthCount,
      totalSessionsCount,
      avgActiveResult,
      totalActiveSecondsResult,
    ] = await Promise.all([
      this.prisma.traineeTrackingSession.count({
        where: activeSessionWhere,
      }),
      this.prisma.traineeTrackingSession.groupBy({
        by: ['traineeAuthId'],
        where: { loginAt: { gte: startOfDay }, traineeAuth: { trainee: programFilter } },
      }).then(r => r.length),
      this.prisma.traineeTrackingSession.groupBy({
        by: ['traineeAuthId'],
        where: { loginAt: { gte: startOfWeek }, traineeAuth: { trainee: programFilter } },
      }).then(r => r.length),
      this.prisma.traineeTrackingSession.groupBy({
        by: ['traineeAuthId'],
        where: { loginAt: { gte: startOfMonth }, traineeAuth: { trainee: programFilter } },
      }).then(r => r.length),
      this.prisma.traineeTrackingSession.count({
        where: { traineeAuth: { trainee: programFilter } },
      }),
      this.prisma.traineeTrackingSession.aggregate({
        _avg: { activeSeconds: true },
        where: { activeSeconds: { gt: 0 }, traineeAuth: { trainee: programFilter } },
      }),
      this.prisma.traineeTrackingSession.aggregate({
        _sum: { activeSeconds: true },
        where: { traineeAuth: { trainee: programFilter } },
      }),
    ]);

    // 3. آخر الجلسات
    const recentSessions = await this.prisma.traineeTrackingSession.findMany({
      where: { traineeAuth: { trainee: hasTraineeFilter ? traineeFilter : {} } },
      select: {
        id: true,
        loginAt: true,
        logoutAt: true,
        lastHeartbeatAt: true,
        activeSeconds: true,
        device: true,
        browser: true,
        os: true,
        ipAddress: true,
        isActive: true,
        logoutType: true,
        traineeAuth: {
          select: {
            id: true,
            trainee: {
              select: {
                id: true,
                nameAr: true,
                nationalId: true,
                photoUrl: true,
                program: { select: { id: true, nameAr: true } },
              },
            },
          },
        },
      },
      orderBy: { loginAt: 'desc' },
      take: 50,
    });

    // 4. النشاط اليومي (30 يوم)
    const dailyRaw = await this.prisma.traineeTrackingSession.findMany({
      where: { loginAt: { gte: thirtyDaysAgo }, traineeAuth: { trainee: programFilter } },
      select: { loginAt: true, activeSeconds: true, traineeAuthId: true },
    });

    const dailyMap: Record<string, { sessions: number; uniqueUsers: Set<string>; totalMinutes: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().split('T')[0]] = { sessions: 0, uniqueUsers: new Set(), totalMinutes: 0 };
    }
    dailyRaw.forEach(s => {
      const key = s.loginAt.toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].sessions++;
        dailyMap[key].uniqueUsers.add(s.traineeAuthId);
        dailyMap[key].totalMinutes += Math.floor((s.activeSeconds || 0) / 60);
      }
    });
    const dailyActivity = Object.entries(dailyMap).map(([date, d]) => ({
      date,
      sessions: d.sessions,
      uniqueUsers: d.uniqueUsers.size,
      totalMinutes: d.totalMinutes,
    }));

    // 5. توزيع الأجهزة
    const deviceRaw = await this.prisma.traineeTrackingSession.groupBy({
      by: ['device'],
      _count: { device: true },
      where: { device: { not: null }, traineeAuth: { trainee: programFilter } },
    });
    const totalDevices = deviceRaw.reduce((s, d) => s + d._count.device, 0);
    const deviceBreakdown = deviceRaw.map(d => ({
      device: d.device || 'غير محدد',
      count: d._count.device,
      percentage: totalDevices > 0 ? Math.round((d._count.device / totalDevices) * 100) : 0,
    }));

    // 6. توزيع المتصفحات
    const browserRaw = await this.prisma.traineeTrackingSession.groupBy({
      by: ['browser'],
      _count: { browser: true },
      where: { browser: { not: null }, traineeAuth: { trainee: programFilter } },
    });
    const browserBreakdown = browserRaw.map(b => ({
      browser: b.browser || 'غير محدد',
      count: b._count.browser,
    }));

    // 7. توزيع أنظمة التشغيل
    const osRaw = await this.prisma.traineeTrackingSession.groupBy({
      by: ['os'],
      _count: { os: true },
      where: { os: { not: null }, traineeAuth: { trainee: programFilter } },
    });
    const osBreakdown = osRaw.map(o => ({
      os: o.os || 'غير محدد',
      count: o._count.os,
    }));

    // 8. توزيع البرامج
    const programsData = await this.prisma.trainingProgram.findMany({
      where: programId ? { id: Number(programId) } : {},
      select: { id: true, nameAr: true, _count: { select: { trainees: true } } },
    });

    const programBreakdown = await Promise.all(
      programsData.map(async (prog) => {
        const [onlineCount, totalSess, avgDur, totalTime] = await Promise.all([
          this.prisma.traineeTrackingSession.count({
            where: { isActive: true, traineeAuth: { trainee: { programId: prog.id } } },
          }),
          this.prisma.traineeTrackingSession.count({
            where: { traineeAuth: { trainee: { programId: prog.id } } },
          }),
          this.prisma.traineeTrackingSession.aggregate({
            _avg: { activeSeconds: true },
            where: { activeSeconds: { gt: 0 }, traineeAuth: { trainee: { programId: prog.id } } },
          }),
          this.prisma.traineeTrackingSession.aggregate({
            _sum: { activeSeconds: true },
            where: { traineeAuth: { trainee: { programId: prog.id } } },
          }),
        ]);
        return {
          id: prog.id,
          nameAr: prog.nameAr,
          traineeCount: prog._count.trainees,
          onlineNow: onlineCount,
          totalSessions: totalSess,
          avgDuration: Math.floor(avgDur._avg.activeSeconds || 0),
          totalTime: totalTime._sum.activeSeconds || 0,
        };
      }),
    );

    // 9. أكثر المتدربين نشاطاً (الشهر)
    const topActiveRaw = await this.prisma.traineeTrackingSession.groupBy({
      by: ['traineeAuthId'],
      _count: { id: true },
      _sum: { activeSeconds: true },
      where: { loginAt: { gte: startOfMonth }, traineeAuth: { trainee: programFilter } },
      orderBy: { _sum: { activeSeconds: 'desc' } },
      take: 20,
    });

    const topIds = topActiveRaw.map(t => t.traineeAuthId);
    const topTrainees = topIds.length > 0
      ? await this.prisma.traineeAuth.findMany({
          where: { id: { in: topIds } },
          select: {
            id: true,
            lastLoginAt: true,
            trainee: { select: { id: true, nameAr: true, nationalId: true, photoUrl: true, program: { select: { id: true, nameAr: true } } } },
          },
        })
      : [];

    const topActive = topActiveRaw.map((raw, i) => {
      const auth = topTrainees.find(a => a.id === raw.traineeAuthId);
      return {
        rank: i + 1,
        traineeAuthId: raw.traineeAuthId,
        trainee: auth?.trainee || null,
        totalSessions: raw._count.id,
        totalTime: raw._sum.activeSeconds || 0,
        lastLogin: auth?.lastLoginAt,
      };
    });

    // 10. أكثر الصفحات زيارة
    const topPagesRaw = await this.prisma.traineePageVisit.groupBy({
      by: ['page'],
      _count: { id: true },
      _sum: { duration: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15,
    });

    const topPages = topPagesRaw.map(p => ({
      page: p.page,
      visits: p._count.id,
      totalDuration: p._sum.duration || 0,
    }));

    return {
      summary: {
        totalOnline,
        activeToday: activeTodayCount,
        activeThisWeek: activeWeekCount,
        activeThisMonth: activeMonthCount,
        totalSessions: totalSessionsCount,
        avgSessionDuration: Math.floor(avgActiveResult._avg.activeSeconds || 0),
        totalActiveTime: totalActiveSecondsResult._sum.activeSeconds || 0,
      },
      onlineNow: onlineNow.map(s => ({
        sessionId: s.id,
        loginAt: s.loginAt,
        lastHeartbeatAt: s.lastHeartbeatAt,
        activeSeconds: s.activeSeconds,
        device: s.device,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress,
        currentPage: s.currentPage,
        trainee: s.traineeAuth.trainee,
        traineeAuthId: s.traineeAuth.id,
      })),
      recentSessions: recentSessions.map(s => ({
        id: s.id,
        loginAt: s.loginAt,
        logoutAt: s.logoutAt,
        lastHeartbeatAt: s.lastHeartbeatAt,
        activeSeconds: s.activeSeconds,
        device: s.device,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress,
        isActive: s.isActive,
        logoutType: s.logoutType,
        trainee: s.traineeAuth.trainee,
        traineeAuthId: s.traineeAuth.id,
      })),
      dailyActivity,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      programBreakdown,
      topActive,
      topPages,
    };
  }

  /**
   * سجل جلسات متدرب محدد
   */
  async getTraineeSessionHistory(traineeAuthId: string, query: { startDate?: string; endDate?: string; page?: number; limit?: number }) {
    const { startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Math.min(Number(limit), 100);
    const take = Math.min(Number(limit), 100);

    const where: any = { traineeAuthId };
    if (startDate || endDate) {
      where.loginAt = {};
      if (startDate) where.loginAt.gte = new Date(startDate);
      if (endDate) where.loginAt.lte = new Date(endDate);
    }

    const [sessions, total, traineeAuth, sessionAgg] = await Promise.all([
      this.prisma.traineeTrackingSession.findMany({
        where,
        select: {
          id: true,
          loginAt: true,
          logoutAt: true,
          lastHeartbeatAt: true,
          activeSeconds: true,
          device: true,
          browser: true,
          os: true,
          ipAddress: true,
          isActive: true,
          logoutType: true,
        },
        orderBy: { loginAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.traineeTrackingSession.count({ where }),
      this.prisma.traineeAuth.findUnique({
        where: { id: traineeAuthId },
        select: {
          id: true,
          lastLoginAt: true,
          trainee: {
            select: { id: true, nameAr: true, nationalId: true, photoUrl: true, program: { select: { id: true, nameAr: true } } },
          },
        },
      }),
      this.prisma.traineeTrackingSession.aggregate({
        _sum: { activeSeconds: true },
        _avg: { activeSeconds: true },
        _count: { id: true },
        _max: { activeSeconds: true },
        where: { traineeAuthId },
      }),
    ]);

    // أكثر الصفحات زيارة لهذا المتدرب
    const topPages = await this.prisma.traineePageVisit.groupBy({
      by: ['page'],
      _count: { id: true },
      _sum: { duration: true },
      where: { session: { traineeAuthId } },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return {
      trainee: traineeAuth?.trainee || null,
      stats: {
        totalSessions: sessionAgg._count.id,
        totalActiveTime: sessionAgg._sum.activeSeconds || 0,
        avgSessionDuration: Math.floor(sessionAgg._avg.activeSeconds || 0),
        longestSession: sessionAgg._max.activeSeconds || 0,
        lastLogin: traineeAuth?.lastLoginAt,
      },
      topPages: topPages.map(p => ({ page: p.page, visits: p._count.id, duration: p._sum.duration || 0 })),
      sessions,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / take),
      },
    };
  }

  // ============================================================
  // طرق مساعدة
  // ============================================================

  /**
   * تحليل User Agent واستخراج الجهاز والمتصفح ونظام التشغيل
   */
  private parseUserAgent(userAgent: string): { device: string; browser: string; os: string } {
    const ua = userAgent.toLowerCase();

    // الجهاز
    let device = 'Desktop';
    if (ua.includes('mobile') || ua.includes('android') && !ua.includes('tablet') || ua.includes('iphone')) {
      device = 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      device = 'Tablet';
    }

    // المتصفح
    let browser = 'Other';
    if (ua.includes('edg/') || ua.includes('edge/')) browser = 'Edge';
    else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

    // نظام التشغيل
    let os = 'Other';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os') || ua.includes('macintosh')) os = 'macOS';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'iOS';
    else if (ua.includes('linux')) os = 'Linux';

    return { device, browser, os };
  }

  // ============================================================
  // التوافقية مع النظام القديم (لن تتعطل الخدمات الحالية)
  // ============================================================

  async endActiveSessions(traineeAuthId: string) {
    const activeSessions = await this.prisma.traineeSession.findMany({
      where: { traineeAuthId, isActive: true },
    });
    for (const session of activeSessions) {
      const duration = Math.floor((Date.now() - session.loginAt.getTime()) / 1000);
      await this.prisma.traineeSession.update({
        where: { id: session.id },
        data: { logoutAt: new Date(), duration, isActive: false },
      });
    }
  }

  async trackActivity(sessionToken: string, activityType: string, page?: string, action?: string, metadata?: any) {
    const session = await this.prisma.traineeSession.findUnique({ where: { sessionToken } });
    if (!session || !session.isActive) return null;
    return this.prisma.traineeActivity.create({
      data: { sessionId: session.id, activityType: activityType as any, page, action, metadata, timestamp: new Date() },
    });
  }

  async updateSessionActivity(sessionToken: string) {
    // يستدعي heartbeat الجديد
    return this.heartbeat(sessionToken);
  }

  async getAdvancedStats(traineeAuthId: string) {
    return this.getTraineeSessionHistory(traineeAuthId, { limit: 7 });
  }

  async getOverallStats() {
    const dashboard = await this.getTrackingDashboard({});
    return {
      totalTrainees: dashboard.summary.totalOnline,
      activeToday: dashboard.summary.activeToday,
      activeThisWeek: dashboard.summary.activeThisWeek,
      activeThisMonth: dashboard.summary.activeThisMonth,
      totalSessions: dashboard.summary.totalSessions,
      totalTimeSpent: dashboard.summary.totalActiveTime,
      averageSessionTime: dashboard.summary.avgSessionDuration,
    };
  }

  private async updateTraineeStats(traineeAuthId: string, action: 'login' | 'logout' | 'activity', sessionDuration?: number) {
    const now = new Date();
    let stats = await this.prisma.traineeStats.findUnique({ where: { traineeAuthId } });
    if (!stats) {
      stats = await this.prisma.traineeStats.create({
        data: { traineeAuthId, firstLogin: now, lastLogin: now, lastActivity: now, totalSessions: 1, thisWeekSessions: 1, thisMonthSessions: 1 },
      });
    } else {
      const updateData: any = { lastActivity: now };
      if (action === 'login') {
        updateData.totalSessions = { increment: 1 };
        updateData.lastLogin = now;
      }
      if (sessionDuration && action === 'logout') {
        updateData.totalTimeSpent = { increment: sessionDuration };
      }
      await this.prisma.traineeStats.update({ where: { traineeAuthId }, data: updateData });
    }
  }

  private detectDevice(userAgent: string): string {
    return this.parseUserAgent(userAgent).device;
  }
}
