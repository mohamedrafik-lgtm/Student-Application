import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionTrackingService } from '../trainee-auth/session-tracking.service';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../audit/audit.service';
import { UserProgramAccessService } from '../users/user-program-access.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  UpdateTraineeAccountDto,
  TraineeAccountQueryDto,
  ResetTraineePasswordDto,
  TraineePlatformStatsQueryDto,
  TraineeTrackingQueryDto,
  TraineeSessionHistoryQueryDto,
  CreateTraineeAccountDto,
  BulkCreateAccountsDto,
  UnassignedTraineesQueryDto,
  DeleteTraineeAccountDto,
} from './dto/trainee-platform.dto';

/** عدد جولات bcrypt الموحد في كل النظام */
const BCRYPT_ROUNDS = 12;

@Injectable()
export class TraineePlatformService {
  constructor(
    private prisma: PrismaService,
    private sessionTrackingService: SessionTrackingService,
    private whatsappService: UnifiedWhatsAppService,
    private settingsService: SettingsService,
    private auditService: AuditService,
    private userProgramAccessService: UserProgramAccessService,
  ) {}

  private normalizeSearchText(value?: string): string {
    if (!value) return '';

    // Normalize Arabic/English digits and collapse repeated spaces.
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const normalizedDigits = value
      .split('')
      .map((char) => {
        const idx = arabicDigits.indexOf(char);
        return idx >= 0 ? String(idx) : char;
      })
      .join('');

    return normalizedDigits.replace(/\s+/g, ' ').trim();
  }

  private buildAccountSearchTermConditions(term: string) {
    const conditions: any[] = [
      { trainee: { nameAr: { contains: term } } },
      { trainee: { nameEn: { contains: term } } },
      { trainee: { nationalId: { contains: term } } },
      { trainee: { email: { contains: term } } },
      { trainee: { phone: { contains: term } } },
      { nationalId: { contains: term } },
    ];
    // بحث برقم الملف (trainee id)
    const idDigits = term.replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
    if (/^\d+$/.test(idDigits)) {
      conditions.push({ trainee: { id: Number(idDigits) } });
    }
    return conditions;
  }

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

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.max(Math.min(Number(limit) || 10, 100), 1); // حد أقصى 100 عنصر
    const skip = (parsedPage - 1) * parsedLimit;
    const take = parsedLimit;
    const normalizedSearch = this.normalizeSearchText(search);
    const searchTerms = normalizedSearch
      ? Array.from(new Set(normalizedSearch.split(' ').filter(Boolean)))
      : [];

    // بناء شروط البحث
    const where: any = {};
    const andConditions: any[] = [];

    if (searchTerms.length > 0) {
      // Every term should be found in at least one searchable field.
      andConditions.push(
        ...searchTerms.map((term) => ({
          OR: this.buildAccountSearchTermConditions(term),
        })),
      );
    }

    const parsedIsActive =
      typeof isActive === 'boolean'
        ? isActive
        : typeof isActive === 'string'
          ? isActive === 'true'
          : undefined;

    if (typeof parsedIsActive === 'boolean') {
      andConditions.push({ isActive: parsedIsActive });
    }

    const parsedProgramId = Number(programId);
    if (!Number.isNaN(parsedProgramId) && parsedProgramId > 0) {
      andConditions.push({
        trainee: {
          programId: parsedProgramId,
        },
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const safeSortBy = ['createdAt', 'lastLoginAt', 'isActive', 'nationalId'].includes(String(sortBy))
      ? String(sortBy)
      : 'createdAt';
    const safeSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    // جلب البيانات مع العدد الكلي
    const [traineeAccounts, total] = await Promise.all([
      this.prisma.traineeAuth.findMany({
        where,
        skip,
        take,
        orderBy: { [safeSortBy]: safeSortOrder },
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
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
        hasNext: parsedPage * parsedLimit < total,
        hasPrev: parsedPage > 1,
      }
    };
  }

  // ============================================================
  // ============ إنشاء حسابات المنصة (إداري) ============
  // ============================================================

  /**
   * توليد كلمة مرور عشوائية قوية (12 حرف)
   * تضمن حرفاً كبيراً وصغيراً ورقماً ورمزاً
   */
  private generateSecurePassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%^&*';
    const all = upper + lower + digits + symbols;

    const pick = (set: string) => set[crypto.randomInt(0, set.length)];
    const chars: string[] = [pick(upper), pick(lower), pick(digits), pick(symbols)];

    while (chars.length < 12) {
      chars.push(pick(all));
    }

    // خلط عشوائي لتوزيع الأحرف
    for (let i = chars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }

  // ============================================================
  // ============ حذف حساب المنصة نهائياً (إداري) ============
  // ============================================================

  /** مهلة التأكيد المطلوبة قبل السماح بالحذف (بالثواني) */
  private static readonly DELETE_DELAY_SECONDS = 5;

  /**
   * معاينة أثر حذف حساب المنصة
   * تُرجع كل السجلات التي ستُحذف تلقائياً (Cascade)
   */
  async getAccountDeletionPreview(id: string, allowedProgramIds: number[] = []) {
    const account = await this.prisma.traineeAuth.findUnique({
      where: { id },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            programId: true,
            program: { select: { id: true, nameAr: true } },
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    // حماية: منع معاينة/حذف حسابات خارج البرامج المسموحة
    if (
      allowedProgramIds.length > 0 &&
      !allowedProgramIds.includes(account.trainee.programId)
    ) {
      throw new BadRequestException('لا تملك صلاحية الوصول لحساب هذا المتدرب');
    }

    // عدّ كل السجلات المرتبطة (ستُحذف تلقائياً عبر Cascade)
    const [
      sessionCount,
      activeSessionCount,
      trackingSessionCount,
      activeTrackingSessionCount,
      heartbeatCount,
      pageVisitCount,
      activityCount,
      statsRecord,
    ] = await Promise.all([
      this.prisma.traineeSession.count({ where: { traineeAuthId: id } }),
      this.prisma.traineeSession.count({
        where: { traineeAuthId: id, isActive: true },
      }),
      this.prisma.traineeTrackingSession.count({ where: { traineeAuthId: id } }),
      this.prisma.traineeTrackingSession.count({
        where: { traineeAuthId: id, isActive: true },
      }),
      this.prisma.traineeHeartbeat.count({
        where: { session: { traineeAuthId: id } },
      }),
      this.prisma.traineePageVisit.count({
        where: { session: { traineeAuthId: id } },
      }),
      this.prisma.traineeActivity.count({
        where: { session: { traineeAuthId: id } },
      }),
      this.prisma.traineeStats.findUnique({
        where: { traineeAuthId: id },
        select: {
          totalSessions: true,
          totalTimeSpent: true,
          totalPageViews: true,
          firstLogin: true,
          lastLogin: true,
        },
      }),
    ]);

    const items = [
      {
        label: 'جلسات الدخول',
        count: sessionCount,
        details: activeSessionCount > 0 ? `${activeSessionCount} جلسة نشطة حالياً` : undefined,
      },
      {
        label: 'جلسات التتبع الجديدة',
        count: trackingSessionCount,
        details:
          activeTrackingSessionCount > 0
            ? `${activeTrackingSessionCount} جلسة تتبع نشطة`
            : undefined,
      },
      { label: 'نبضات النشاط (Heartbeat)', count: heartbeatCount },
      { label: 'زيارات الصفحات', count: pageVisitCount },
      { label: 'الأنشطة المسجلة', count: activityCount },
    ];

    const totalRecords =
      sessionCount + trackingSessionCount + heartbeatCount + pageVisitCount + activityCount;

    return {
      account: {
        id: account.id,
        nationalId: account.nationalId,
        isActive: account.isActive,
        lastLoginAt: account.lastLoginAt,
        createdAt: account.createdAt,
      },
      trainee: {
        id: account.trainee.id,
        nameAr: account.trainee.nameAr,
        nationalId: account.trainee.nationalId,
        programName: account.trainee.program?.nameAr || 'غير محدد',
      },
      items,
      totalRecords,
      // ملخص الإحصائيات (معلومات فقط، ستُحذف)
      statsSummary: statsRecord
        ? {
            totalSessions: statsRecord.totalSessions,
            totalTimeSpent: statsRecord.totalTimeSpent,
            totalPageVisits: statsRecord.totalPageViews,
            firstLogin: statsRecord.firstLogin,
            lastLogin: statsRecord.lastLogin,
          }
        : null,
      hasActiveSessions: activeSessionCount > 0 || activeTrackingSessionCount > 0,
      // ملاحظة: سجل المتدرب نفسه لن يُحذف
      note: 'سيتم حذف حساب المنصة وكل سجلات التتبع المرتبطة به. سجل المتدرب الأساسي وبياناته الأكاديمية والمالية لن تتأثر.',
    };
  }

  /**
   * حذف حساب المنصة نهائياً
   * - يحذف TraineeAuth وكل الجلسات والنبضات والزيارات والإحصائيات (Cascade)
   * - لا يحذف سجل المتدرب ولا بياناته الأكاديمية/المالية
   */
  async deleteAccountPermanently(
    id: string,
    dto: DeleteTraineeAccountDto,
    userId?: string,
    req?: any,
  ) {
    // 1) جلب الحساب مع بيانات المتدرب
    const account = await this.prisma.traineeAuth.findUnique({
      where: { id },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            programId: true,
            program: { select: { id: true, nameAr: true } },
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    // 2) حماية: البرامج المسموحة
    const allowedProgramIds = await this.getAllowedProgramIds(userId);
    if (
      allowedProgramIds.length > 0 &&
      !allowedProgramIds.includes(account.trainee.programId)
    ) {
      throw new BadRequestException('لا تملك صلاحية الوصول لحساب هذا المتدرب');
    }

    // 3) حماية: التأكد من انتهاء مهلة الانتظار
    if (dto.countdownElapsed !== true) {
      throw new BadRequestException(
        `يجب انتظار ${TraineePlatformService.DELETE_DELAY_SECONDS} ثانية قبل تأكيد الحذف`,
      );
    }

    // 4) فحص الجلسات النشطة
    const [activeSessions, activeTracking] = await Promise.all([
      this.prisma.traineeSession.count({
        where: { traineeAuthId: id, isActive: true },
      }),
      this.prisma.traineeTrackingSession.count({
        where: { traineeAuthId: id, isActive: true },
      }),
    ]);

    if ((activeSessions > 0 || activeTracking > 0) && !dto.force) {
      throw new BadRequestException(
        'المتدرب لديه جلسات نشطة حالياً. أعد المحاولة مع خيار الإجباري لإغلاق الجلسات وحذف الحساب.',
      );
    }

    // 5) تنفيذ الحذف (كل العلاقات Cascade في schema)
    //    trainee_sessions → trainee_activities
    //    trainee_tracking_sessions → trainee_heartbeats, trainee_page_visits
    //    trainee_stats
    await this.prisma.traineeAuth.delete({ where: { id } });

    // 6) تسجيل العملية في سجل التدقيق
    if (userId) {
      try {
        await this.auditService.log({
          action: 'DELETE',
          entity: 'TraineeAuth',
          entityId: id,
          userId,
          details: {
            message: `تم حذف حساب منصة المتدرب ${account.trainee.nameAr} نهائياً`,
            traineeId: account.trainee.id,
            traineeName: account.trainee.nameAr,
            nationalId: account.trainee.nationalId,
            programName: account.trainee.program?.nameAr,
            forced: dto.force || false,
            hadActiveSessions: activeSessions + activeTracking > 0,
            ipAddress: req?.ip,
            userAgent: req?.get?.('User-Agent'),
          },
        });
      } catch (error) {
        console.error('خطأ في تسجيل تدقيق حذف الحساب:', error);
      }
    }

    return {
      success: true,
      message: `تم حذف حساب منصة المتدرب ${account.trainee.nameAr} نهائياً`,
      deletedAccountId: id,
      traineeId: account.trainee.id,
      traineeName: account.trainee.nameAr,
      // توضيح: المتدرب لم يُحذف، يمكن إعادة إنشاء الحساب لاحقاً
      note: 'سجل المتدرب وبياناته ما زالت موجودة. يمكن إعادة إنشاء حساب المنصة في أي وقت.',
    };
  }

  /**
   * إحصائيات حسابات المنصة على مستوى كل النتائج
   * (تُتجنب مشكلة العدّ داخل الصفحة الحالية)
   */
  async getAccountsStats(programFilter?: number | { in: number[] }) {
    const baseWhere: any = programFilter ? { trainee: { programId: programFilter } } : {};

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [total, active, inactive, loggedInToday] = await Promise.all([
      this.prisma.traineeAuth.count({ where: baseWhere }),
      this.prisma.traineeAuth.count({ where: { ...baseWhere, isActive: true } }),
      this.prisma.traineeAuth.count({ where: { ...baseWhere, isActive: false } }),
      this.prisma.traineeAuth.count({
        where: { ...baseWhere, lastLoginAt: { gte: startOfToday } },
      }),
    ]);

    return { total, active, inactive, loggedInToday };
  }

  /**
   * جلب المتدربين الذين لا يملكون حساب منصة
   * (للاختيار في نافذة الإنشاء الجماعي)
   */
  async getUnassignedTrainees(query: UnassignedTraineesQueryDto, allowedProgramIds?: number[]) {
    const {
      search,
      programId,
      page = 1,
      limit = 20,
    } = query;

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.max(Math.min(Number(limit) || 20, 200), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const normalizedSearch = this.normalizeSearchText(search);
    const searchTerms = normalizedSearch
      ? Array.from(new Set(normalizedSearch.split(' ').filter(Boolean)))
      : [];

    const andConditions: any[] = [
      // لا يملك حساب منصة
      { traineeAuth: null },
      // يجب أن يكون لديه رقم وطني وكلمة مرور
      { nationalId: { not: '' } },
    ];

    // فلترة البرامج المسموحة للمستخدم
    const effectiveProgramId =
      allowedProgramIds && allowedProgramIds.length > 0
        ? programId && allowedProgramIds.includes(Number(programId))
          ? Number(programId)
          : allowedProgramIds
        : programId
          ? Number(programId)
          : undefined;

    if (effectiveProgramId) {
      andConditions.push({
        programId: Array.isArray(effectiveProgramId)
          ? { in: effectiveProgramId }
          : effectiveProgramId,
      });
    }

    // البحث متعدد الكلمات (AND logic)
    for (const term of searchTerms) {
      andConditions.push({
        OR: [
          { nameAr: { contains: term } },
          { nameEn: { contains: term } },
          { nationalId: { contains: term } },
          { phone: { contains: term } },
        ],
      });
    }

    const where = { AND: andConditions };

    const [trainees, total] = await Promise.all([
      this.prisma.trainee.findMany({
        where,
        skip,
        take: parsedLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          nationalId: true,
          phone: true,
          photoUrl: true,
          program: { select: { id: true, nameAr: true } },
        },
      }),
      this.prisma.trainee.count({ where }),
    ]);

    return {
      data: trainees,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
        hasNext: parsedPage * parsedLimit < total,
        hasPrev: parsedPage > 1,
      },
    };
  }

  /**
   * إحصائيات المتدربين بدون حسابات منصة
   */
  async getUnassignedStats(allowedProgramIds?: number[]) {
    const baseWhere: any = allowedProgramIds?.length
      ? { programId: { in: allowedProgramIds } }
      : {};

    const [totalTrainees, withAccount] = await Promise.all([
      this.prisma.trainee.count({ where: baseWhere }),
      this.prisma.traineeAuth.count({
        where: { trainee: baseWhere },
      }),
    ]);

    const perProgram = await this.prisma.trainee.groupBy({
      by: ['programId'],
      where: {
        ...baseWhere,
        traineeAuth: null,
      },
      _count: { _all: true },
    });

    const programs = await this.prisma.trainingProgram.findMany({
      where: baseWhere.programId ? { id: { in: baseWhere.programId as any } } : {},
      select: { id: true, nameAr: true },
    });

    const programMap = new Map(programs.map((p) => [p.id, p.nameAr]));

    return {
      totalTrainees,
      withAccount,
      withoutAccount: totalTrainees - withAccount,
      perProgram: perProgram.map((p) => ({
        programId: p.programId,
        programName: programMap.get(p.programId) || 'غير محدد',
        count: p._count._all,
      })),
    };
  }

  /**
   * إنشاء حساب منصة لمتدرب واحد أو عدة متدربين
   * كلمة المرور افتراضياً = نفس الرقم القومي
   */
  async createAccounts(
    dto: CreateTraineeAccountDto,
    userId?: string,
    req?: any,
  ): Promise<any> {
    const {
      traineeIds,
      passwordMode = 'nationalId',
      includeExisting = false,
    } = dto;

    const uniqueIds = Array.from(new Set(traineeIds.map((id) => Number(id))));

    // جلب بيانات المتدربين
    const trainees = await this.prisma.trainee.findMany({
      where: { id: { in: uniqueIds } },
      include: {
        traineeAuth: true,
        program: { select: { id: true, nameAr: true } },
      },
    });

    if (trainees.length === 0) {
      throw new NotFoundException('لم يتم العثور على المتدربين المحددين');
    }

    // التحقق من البرامج المسموحة للمستخدم
    const allowedProgramIds = await this.getAllowedProgramIds(userId);
    if (allowedProgramIds.length > 0) {
      const unauthorized = trainees.filter(
        (t) => !allowedProgramIds.includes(t.programId),
      );
      if (unauthorized.length > 0) {
        throw new BadRequestException(
          `لا تملك صلاحية الوصول لبرامج بعض المتدربين: ${unauthorized
            .map((t) => t.nameAr)
            .join('، ')}`,
        );
      }
    }

    const results: any[] = [];
    const failed: any[] = [];
    const accountsToCreate: any[] = [];

    for (const trainee of trainees) {
      // فحص التكرار
      if (trainee.traineeAuth && !includeExisting) {
        failed.push({
          traineeId: trainee.id,
          nameAr: trainee.nameAr,
          nationalId: trainee.nationalId,
          reason: 'يوجد حساب بالفعل',
        });
        continue;
      }

      // التحقق من صحة البيانات المطلوبة
      if (!trainee.nationalId) {
        failed.push({
          traineeId: trainee.id,
          nameAr: trainee.nameAr,
          reason: 'لا يوجد رقم قومي',
        });
        continue;
      }

      if (!trainee.birthDate) {
        failed.push({
          traineeId: trainee.id,
          nameAr: trainee.nameAr,
          reason: 'لا يوجد تاريخ ميلاد',
        });
        continue;
      }

      // تحديد كلمة المرور
      const plainPassword =
        passwordMode === 'random'
          ? this.generateSecurePassword()
          : trainee.nationalId;

      const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

      if (trainee.traineeAuth && includeExisting) {
        // تحديث الحساب الموجود
        const updated = await this.prisma.traineeAuth.update({
          where: { id: trainee.traineeAuth.id },
          data: {
            password: hashedPassword,
            isActive: true,
            updatedAt: new Date(),
          },
          select: { id: true, nationalId: true, isActive: true },
        });
        results.push({
          traineeId: trainee.id,
          accountId: updated.id,
          nameAr: trainee.nameAr,
          nationalId: trainee.nationalId,
          password: plainPassword,
          action: 'updated' as const,
        });
      } else {
        accountsToCreate.push({
          trainee,
          plainPassword,
          hashedPassword,
        });
      }
    }

    // إنشاء الحسابات دفعة واحدة
    if (accountsToCreate.length > 0) {
      await this.prisma.$transaction(
        accountsToCreate.map(({ trainee, hashedPassword }) =>
          this.prisma.traineeAuth.create({
            data: {
              nationalId: trainee.nationalId,
              birthDate: trainee.birthDate,
              password: hashedPassword,
              traineeId: trainee.id,
              isActive: true,
            },
            select: { id: true },
          }),
        ),
      );

      for (const { trainee, plainPassword } of accountsToCreate) {
        results.push({
          traineeId: trainee.id,
          nameAr: trainee.nameAr,
          nationalId: trainee.nationalId,
          password: plainPassword,
          action: 'created' as const,
        });
      }
    }

    // تسجيل العملية في سجل التدقيق
    if (userId && results.length > 0) {
      try {
        await this.auditService.log({
          action: 'CREATE',
          entity: 'TraineeAuth',
          entityId: results.map((r) => r.traineeId).join(','),
          userId,
          details: {
            message: `تم إنشاء ${results.length} حساب منصة`,
            count: results.length,
            passwordMode,
            failedCount: failed.length,
            trainees: results.map((r) => ({
              id: r.traineeId,
              name: r.nameAr,
              nationalId: r.nationalId,
            })),
          },
        });
      } catch (error) {
        console.error('خطأ في تسجيل التدقيق:', error);
      }
    }

    return {
      success: results.length > 0,
      message:
        failed.length === 0
          ? `تم إنشاء ${results.length} حساب بنجاح`
          : `تم إنشاء ${results.length} حساب، و ${failed.length} فشل`,
      totalRequested: uniqueIds.length,
      created: results.filter((r) => r.action === 'created').length,
      updated: results.filter((r) => r.action === 'updated').length,
      failed: failed.length,
      results,
      failedItems: failed,
    };
  }

  /**
   * إنشاء حسابات جماعية لبرنامج تدريبي أو لكل المتدربين
   * - يتخطى من يملك حساباً مسبقاً
   */
  async bulkCreateAccounts(
    dto: BulkCreateAccountsDto,
    userId?: string,
    req?: any,
  ): Promise<any> {
    const {
      programId,
      scope = 'missing-in-program',
      passwordMode = 'nationalId',
      includeExisting = false,
    } = dto;

    // التحقق من صلاحية الوصول للبرنامج المطلوب
    const allowedProgramIds = await this.getAllowedProgramIds(userId);
    if (
      programId &&
      allowedProgramIds.length > 0 &&
      !allowedProgramIds.includes(Number(programId))
    ) {
      throw new BadRequestException('لا تملك صلاحية الوصول لهذا البرنامج التدريبي');
    }

    // جمع معرّفات المتدربين المؤهلين
    const traineeIds = await this.getTraineeIdsForBulk(
      programId,
      includeExisting,
      allowedProgramIds,
    );

    if (traineeIds.length === 0) {
      return {
        success: true,
        message: 'لا يوجد متدربون مطابقون للشروط المحددة',
        totalRequested: 0,
        created: 0,
        updated: 0,
        failed: 0,
        results: [],
        failedItems: [],
      };
    }

    // معالج دفعات لتجنب تجاوز حد المعاملات
    const BATCH_SIZE = 100;
    const allResults: any[] = [];
    const allFailed: any[] = [];

    for (let i = 0; i < traineeIds.length; i += BATCH_SIZE) {
      const chunk = traineeIds.slice(i, i + BATCH_SIZE);
      const chunkResult = await this.createAccounts(
        { traineeIds: chunk, passwordMode, includeExisting },
        userId,
        req,
      );
      allResults.push(...chunkResult.results);
      allFailed.push(...chunkResult.failedItems);
    }

    return {
      success: allResults.length > 0,
      message:
        allFailed.length === 0
          ? `تم إنشاء ${allResults.length} حساب بنجاح`
          : `تم إنشاء ${allResults.length} حساب، و ${allFailed.length} فشل`,
      totalRequested: traineeIds.length,
      created: allResults.filter((r) => r.action === 'created').length,
      updated: allResults.filter((r) => r.action === 'updated').length,
      failed: allFailed.length,
      results: allResults,
      failedItems: allFailed,
    };
  }

  /**
   * جمع معرّفات المتدربين المؤهلين للإنشاء الجماعي
   */
  private async getTraineeIdsForBulk(
    programId: number | undefined,
    includeExisting: boolean,
    allowedProgramIds?: number[],
  ): Promise<number[]> {
    const andConditions: any[] = [{ nationalId: { not: '' } }];

    // فلترة البرامج المسموحة
    const effectiveProgramId =
      allowedProgramIds && allowedProgramIds.length > 0
        ? programId && allowedProgramIds.includes(Number(programId))
          ? Number(programId)
          : allowedProgramIds
        : programId
          ? Number(programId)
          : undefined;

    if (effectiveProgramId) {
      andConditions.push({
        programId: Array.isArray(effectiveProgramId)
          ? { in: effectiveProgramId }
          : effectiveProgramId,
      });
    }

    // تحديد من يُستثنى (لديه حساب) ما لم يُطلب تجاوز ذلك
    if (!includeExisting) {
      andConditions.push({ traineeAuth: null });
    }

    const trainees = await this.prisma.trainee.findMany({
      where: { AND: andConditions },
      select: { id: true },
    });

    return trainees.map((t) => t.id);
  }

  /**
   * جلب البرامج المسموحة للمستخدم الحالي
   * قائمة فارغة = كل البرامج مسموحة
   */
  private async getAllowedProgramIds(userId?: string): Promise<number[]> {
    if (!userId) return [];
    try {
      return await this.userProgramAccessService.getAllowedProgramIds(userId);
    } catch (error) {
      console.error('خطأ في جلب البرامج المسموحة:', error);
      return [];
    }
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
   * نظام تتبع نشاط المتدربين الشامل - يستخدم الجداول الجديدة
   */
  async getTraineeTracking(query: TraineeTrackingQueryDto) {
    return this.sessionTrackingService.getTrackingDashboard(query);
  }

  /**
   * سجل جلسات متدرب محدد - يستخدم الجداول الجديدة
   */
  async getTraineeSessionHistory(traineeAuthId: string, query: TraineeSessionHistoryQueryDto) {
    return this.sessionTrackingService.getTraineeSessionHistory(traineeAuthId, query);
  }

  /**
   * جلب إحصائيات منصة المتدربين (قديم — يستدعي الطريقة الجديدة)
   */
  async getTraineePlatformStats(query: TraineePlatformStatsQueryDto) {
    return this.getTraineeTracking({ programId: query.programId });
  }

  /**
   * إنهاء الجلسات المنتهية الصلاحية وإعادة حساب المتوسطات
   */
  async expireInactiveSessions() {
    return this.sessionTrackingService.expireInactiveSessions();
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

  /**
   * ==========================================
   * التوزيعات الاختيارية
   * ==========================================
   */

  /**
   * جلب التوزيعات المتاحة للتسجيل الذاتي
   */
  async getAvailableDistributions(traineeId: number) {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    const now = new Date();

    // جلب التوزيعات المتاحة لهذا البرنامج ولنظام اختيار المتدربين
    const distributions = await this.prisma.traineeDistribution.findMany({
      where: {
        programId: trainee.programId,
        assignmentMode: 'TRAINEE_CHOICE',
        isVisibleToTrainees: true,
      },
      include: {
        classroom: true,
        rooms: {
          include: {
            _count: {
              select: { assignments: true }
            }
          }
        }
      }
    });

    // تحقق من المجموعات التي انضم إليها المتدرب
    const joinedAssignments = await this.prisma.distributionAssignment.findMany({
      where: {
        traineeId,
        room: {
          distribution: {
            assignmentMode: 'TRAINEE_CHOICE'
          }
        }
      },
      include: {
        room: true
      }
    });

    const joinedDistributionIds = joinedAssignments.map(a => a.room.distributionId);

    // تجهيز البيانات للعرض
    return distributions.map(dist => {
      // تحقق من التواريخ
      const isRegistrationOpen = 
        (!dist.registrationStartDate || now >= dist.registrationStartDate) &&
        (!dist.registrationEndDate || now <= dist.registrationEndDate);

      const isJoined = joinedDistributionIds.includes(dist.id);
      const joinedRoomId = isJoined 
        ? joinedAssignments.find(a => a.room.distributionId === dist.id)?.roomId 
        : null;

      return {
        id: dist.id,
        type: dist.type,
        academicYear: dist.academicYear,
        classroomName: dist.classroom?.name || 'عام للبرنامج',
        isRegistrationOpen,
        registrationStartDate: dist.registrationStartDate,
        registrationEndDate: dist.registrationEndDate,
        isJoined,
        joinedRoomId,
        rooms: dist.rooms.map(room => ({
          id: room.id,
          name: room.roomName,
          capacity: room.capacity,
          enrolledCount: room._count.assignments,
          isFull: room.capacity ? room._count.assignments >= room.capacity : false
        }))
      };
    });
  }

  /**
   * الانضمام إلى مجموعة (قاعة)
   */
  async joinDistributionRoom(traineeId: number, roomId: string) {
    const room = await this.prisma.distributionRoom.findUnique({
      where: { id: roomId },
      include: {
        distribution: true,
        _count: {
          select: { assignments: true }
        }
      }
    });

    if (!room) {
      throw new NotFoundException('القاعة غير موجودة');
    }

    const dist = room.distribution;

    if (dist.assignmentMode !== 'TRAINEE_CHOICE') {
      throw new BadRequestException('هذا التوزيع لا يسمح بالتسجيل الذاتي');
    }

    if (!dist.isVisibleToTrainees) {
      throw new BadRequestException('هذا التوزيع غير متاح حالياً');
    }

    const now = new Date();
    if (dist.registrationStartDate && now < dist.registrationStartDate) {
      throw new BadRequestException('لم يبدأ التسجيل في هذا التوزيع بعد');
    }
    if (dist.registrationEndDate && now > dist.registrationEndDate) {
      throw new BadRequestException('انتهت فترة التسجيل في هذا التوزيع');
    }

    if (room.capacity && room._count.assignments >= room.capacity) {
      throw new BadRequestException('هذه المجموعة ممتلئة');
    }

    // التأكد من عدم التسجيل في نفس القاعة مسبقاً
    const existingAssignment = await this.prisma.distributionAssignment.findFirst({
      where: {
        traineeId,
        room: {
          distributionId: dist.id
        }
      },
      include: {
        room: true
      }
    });

    if (existingAssignment && existingAssignment.roomId === room.id) {
      throw new BadRequestException('أنت مسجل بالفعل في هذه المجموعة');
    }

    if (room.capacity && room._count.assignments >= room.capacity) {
      throw new BadRequestException('هذه المجموعة ممتلئة');
    }

    // إذا كان مسجلاً في مجموعة أخرى بنفس التوزيع، نقوم بإزالته منها أولاً (طالما فترة التسجيل مفتوحة)
    if (existingAssignment) {
      await this.prisma.distributionAssignment.delete({
        where: { id: existingAssignment.id }
      });
    }

    // التسجيل في المجموعة الجديدة
    const assignment = await this.prisma.distributionAssignment.create({
      data: {
        roomId: room.id,
        traineeId,
        orderNumber: room._count.assignments + 1, // ترتيبه في القاعة
        notes: existingAssignment ? 'تغيير مجموعة (تسجيل ذاتي)' : 'تسجيل ذاتي'
      }
    });

    return { success: true, message: 'تم الانضمام للمجموعة بنجاح', assignment };
  }
}
