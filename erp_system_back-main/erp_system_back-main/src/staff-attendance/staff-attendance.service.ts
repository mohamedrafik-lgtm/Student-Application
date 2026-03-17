import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CheckInDto, CheckOutDto } from './dto/check-in.dto';
import { ManualRecordDto, UpdateLogDto } from './dto/manual-record.dto';
import { UpdateSettingsDto } from './dto/settings.dto';
import { EnrollStaffDto, BulkEnrollStaffDto, UpdateEnrollmentDto } from './dto/enrollment.dto';
import { CreateLeaveRequestDto, ReviewLeaveRequestDto } from './dto/leave-request.dto';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';
import {
  getTodayDateUTC, getTodayRange, isLateNow,
  getCurrentDayName, buildTimeToday, buildDateTimeInTz, getMonthRange,
  isValidTimezone, getDatePartsInTz,
} from './timezone.helper';

@Injectable()
export class StaffAttendanceService {
  constructor(private prisma: PrismaService) {}

  // =============== الإعدادات ===============

  /** حساب المسافة بين نقطتين (Haversine) بالمتر */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // نصف قطر الأرض بالمتر
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** التحقق من أن الموظف داخل إحدى المناطق المسموحة */
  private validateLocationInZonesList(lat: number, lon: number, zones: { latitude: number; longitude: number; radius: number; name: string }[]): { valid: boolean; zoneName?: string } {
    if (zones.length === 0) return { valid: true }; // لا توجد مناطق = مسموح من أي مكان
    for (const zone of zones) {
      const dist = this.haversineDistance(lat, lon, zone.latitude, zone.longitude);
      if (dist <= zone.radius) return { valid: true, zoneName: zone.name };
    }
    return { valid: false };
  }

  /** الحصول على المناطق المسموحة لموظف معين: المناطق العامة + المناطق المخصصة له */
  private async getEmployeeZones(userId: string): Promise<{ id: string; name: string; latitude: number; longitude: number; radius: number; color: string; isGlobal: boolean }[]> {
    // المناطق المخصصة لهذا الموظف
    const enrollment = await this.prisma.staffAttendanceEnrollment.findUnique({
      where: { userId },
      include: {
        zones: {
          include: {
            zone: true,
          },
        },
      },
    });

    const assignedZones = enrollment?.zones
      ?.filter(ez => ez.zone.isActive)
      ?.map(ez => ez.zone) || [];

    // إذا الموظف عنده مناطق مخصصة وغير مسموح له بالنقاط العامة
    const hasCustomZones = assignedZones.length > 0;
    const allowGlobal = enrollment?.allowGlobalZones ?? true;

    // المناطق العامة (للجميع) — إلا إذا الموظف مقيد بنقاطه المخصصة فقط
    let globalZones: typeof assignedZones = [];
    if (!hasCustomZones || allowGlobal) {
      globalZones = await this.prisma.staffAttendanceZone.findMany({
        where: { isActive: true, isGlobal: true },
      });
    }

    // دمج بدون تكرار
    const allZoneIds = new Set<string>();
    const result: typeof globalZones = [];
    for (const z of [...globalZones, ...assignedZones]) {
      if (!allZoneIds.has(z.id)) {
        allZoneIds.add(z.id);
        result.push(z);
      }
    }
    return result;
  }

  /** الحصول على الإعدادات الفعلية للموظف (إعدادات مخصصة أو عامة) */
  private async getEffectiveSettings(userId: string, globalSettings: any, refDay?: string) {
    const enrollment = await this.prisma.staffAttendanceEnrollment.findUnique({
      where: { userId },
    });

    // أيام الإجازة: إذا محدد أيام عمل مخصصة، نحسب أيام الإجازة كعكسها
    const allDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    let effectiveOffDays = globalSettings.weeklyOffDays as string[];
    let effectiveWorkDays: string[] | null = null;

    if (enrollment?.customWorkDays && Array.isArray(enrollment.customWorkDays) && (enrollment.customWorkDays as string[]).length > 0) {
      effectiveWorkDays = (enrollment.customWorkDays as string[]).map(d => d.toUpperCase());
      effectiveOffDays = allDays.filter(d => !effectiveWorkDays!.includes(d));
    }

    // جدول مخصص لكل يوم
    const daySchedules = enrollment?.customDaySchedules as Record<string, { start: string; end: string }> | null;

    // إذا يوجد جدول مخصص لكل يوم، الأيام الموجودة في الجدول هي أيام العمل
    if (daySchedules && Object.keys(daySchedules).length > 0) {
      const scheduledDays = Object.keys(daySchedules).map(d => d.toUpperCase());
      effectiveWorkDays = scheduledDays;
      effectiveOffDays = allDays.filter(d => !scheduledDays.includes(d));
    }

    let workStartTime = enrollment?.customWorkStartTime || globalSettings.workStartTime;
    let workEndTime = enrollment?.customWorkEndTime || globalSettings.workEndTime;
    let workHoursPerDay = enrollment?.customWorkHoursPerDay ?? globalSettings.workHoursPerDay;

    // إذا يوجد جدول مخصص لكل يوم، نتحقق من اليوم الحالي
    if (daySchedules && refDay) {
      const dayName = refDay.toUpperCase();
      // البحث بدون حساسية لحالة الأحرف
      const daySchedule = daySchedules[dayName] || daySchedules[refDay] || Object.entries(daySchedules).find(([k]) => k.toUpperCase() === dayName)?.[1];
      if (daySchedule) {
        workStartTime = daySchedule.start;
        workEndTime = daySchedule.end;
        // حساب ساعات العمل من الأوقات المخصصة
        const [sh, sm] = daySchedule.start.split(':').map(Number);
        const [eh, em] = daySchedule.end.split(':').map(Number);
        let startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;
        if (endMin <= startMin) endMin += 24 * 60;
        workHoursPerDay = (endMin - startMin) / 60;
      }
    }

    return {
      workStartTime,
      workEndTime,
      workHoursPerDay,
      lateThresholdMinutes: enrollment?.customLateThresholdMinutes ?? globalSettings.lateThresholdMinutes,
      earlyLeaveThreshold: enrollment?.customEarlyLeaveThresholdMinutes ?? globalSettings.earlyLeaveThreshold,
      weeklyOffDays: effectiveOffDays,
      customWorkDays: effectiveWorkDays,
    };
  }

  /** الحصول على المنطقة الزمنية من الإعدادات — الافتراضي مصر */
  private getTimezone(settings: { timezone?: string | null }): string {
    return settings?.timezone || 'Africa/Cairo';
  }

  async getSettings() {
    let settings = await this.prisma.staffAttendanceSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.staffAttendanceSettings.create({
        data: {
          workHoursPerDay: 8,
          workStartTime: '09:00',
          workEndTime: '17:00',
          lateThresholdMinutes: 15,
          earlyLeaveThreshold: 30,
          weeklyOffDays: ['FRIDAY'],
          timezone: 'Africa/Cairo',
          isActive: true,
        },
      });
    }
    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const settings = await this.getSettings();
    return this.prisma.staffAttendanceSettings.update({
      where: { id: settings.id },
      data: {
        ...(dto.workHoursPerDay !== undefined && { workHoursPerDay: dto.workHoursPerDay }),
        ...(dto.workStartTime !== undefined && { workStartTime: dto.workStartTime }),
        ...(dto.workEndTime !== undefined && { workEndTime: dto.workEndTime }),
        ...(dto.lateThresholdMinutes !== undefined && { lateThresholdMinutes: dto.lateThresholdMinutes }),
        ...(dto.earlyLeaveThreshold !== undefined && { earlyLeaveThreshold: dto.earlyLeaveThreshold }),
        ...(dto.weeklyOffDays !== undefined && { weeklyOffDays: dto.weeklyOffDays }),
        ...(dto.requireLocation !== undefined && { requireLocation: dto.requireLocation }),
        ...(dto.requireCheckInLocation !== undefined && { requireCheckInLocation: dto.requireCheckInLocation }),
        ...(dto.requireCheckOutLocation !== undefined && { requireCheckOutLocation: dto.requireCheckOutLocation }),
        ...(dto.locationLatitude !== undefined && { locationLatitude: dto.locationLatitude }),
        ...(dto.locationLongitude !== undefined && { locationLongitude: dto.locationLongitude }),
        ...(dto.locationRadius !== undefined && { locationRadius: dto.locationRadius }),
        ...(dto.timezone !== undefined && isValidTimezone(dto.timezone) && { timezone: dto.timezone }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  // =============== تسجيل الموظفين ===============

  async getEnrollments(includeInactive = false) {
    return this.prisma.staffAttendanceEnrollment.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, photoUrl: true, accountType: true } },
        enrolledByUser: { select: { id: true, name: true } },
        zones: {
          include: {
            zone: { select: { id: true, name: true, color: true, isGlobal: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async enrollStaff(dto: EnrollStaffDto, enrollerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const existing = await this.prisma.staffAttendanceEnrollment.findUnique({
      where: { userId: dto.userId },
    });
    if (existing) {
      // إعادة تفعيل إذا كان معطلاً
      if (!existing.isActive) {
        return this.prisma.staffAttendanceEnrollment.update({
          where: { id: existing.id },
          data: { isActive: true, enrolledBy: enrollerId, notes: dto.notes },
          include: { user: { select: { id: true, name: true, email: true } } },
        });
      }
      throw new BadRequestException('الموظف مسجل بالفعل في نظام الحضور');
    }

    return this.prisma.staffAttendanceEnrollment.create({
      data: {
        userId: dto.userId,
        enrolledBy: enrollerId,
        notes: dto.notes,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async bulkEnrollStaff(dto: BulkEnrollStaffDto, enrollerId: string) {
    const results = [];
    for (const userId of dto.userIds) {
      try {
        const result = await this.enrollStaff({ userId, notes: dto.notes }, enrollerId);
        results.push({ userId, success: true, data: result });
      } catch (error: any) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    return results;
  }

  async unenrollStaff(userId: string) {
    const enrollment = await this.prisma.staffAttendanceEnrollment.findUnique({
      where: { userId },
    });
    if (!enrollment) throw new NotFoundException('الموظف غير مسجل في نظام الحضور');
    
    return this.prisma.staffAttendanceEnrollment.update({
      where: { id: enrollment.id },
      data: { isActive: false },
    });
  }

  async updateEnrollment(userId: string, dto: UpdateEnrollmentDto) {
    const enrollment = await this.prisma.staffAttendanceEnrollment.findUnique({
      where: { userId },
    });
    if (!enrollment) throw new NotFoundException('الموظف غير مسجل في نظام الحضور');

    const { zoneIds, customWorkDays, customDaySchedules, ...restDto } = dto;

    // تحديث البيانات الأساسية + الجدول المخصص
    const updateData: any = { ...restDto };
    if (customWorkDays !== undefined) {
      updateData.customWorkDays = customWorkDays;
    }
    if (customDaySchedules !== undefined) {
      updateData.customDaySchedules = customDaySchedules;
    }

    const updated = await this.prisma.staffAttendanceEnrollment.update({
      where: { id: enrollment.id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        zones: { include: { zone: { select: { id: true, name: true, color: true } } } },
      },
    });

    // تحديث المناطق المخصصة
    if (zoneIds !== undefined) {
      // حذف جميع الربط القديم
      await this.prisma.staffEnrollmentZone.deleteMany({
        where: { enrollmentId: enrollment.id },
      });
      // إنشاء الربط الجديد
      if (zoneIds.length > 0) {
        await this.prisma.staffEnrollmentZone.createMany({
          data: zoneIds.map(zoneId => ({
            enrollmentId: enrollment.id,
            zoneId,
          })),
          skipDuplicates: true,
        });
      }

      // إرجاع بيانات محدّثة
      return this.prisma.staffAttendanceEnrollment.findUnique({
        where: { id: enrollment.id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          zones: { include: { zone: { select: { id: true, name: true, color: true } } } },
        },
      });
    }

    return updated;
  }

  // =============== تسجيل الحضور والانصراف ===============

  async checkIn(userId: string, dto: CheckInDto) {
    // التحقق أن الموظف مسجل ومفعّل
    const enrollment = await this.prisma.staffAttendanceEnrollment.findUnique({
      where: { userId },
    });
    if (!enrollment || !enrollment.isActive) {
      throw new ForbiddenException('غير مسجل في نظام الحضور أو غير مفعّل');
    }

    const settings = await this.getSettings();
    if (!settings.isActive) throw new BadRequestException('نظام الحضور معطّل حالياً');

    const tz = this.getTimezone(settings);
    const todayDayForSchedule = getCurrentDayName(tz);

    // الحصول على الإعدادات الفعلية للموظف
    const effective = await this.getEffectiveSettings(userId, settings, todayDayForSchedule);

    // التحقق من الموقع الجغرافي باستخدام المناطق المخصصة للموظف
    const strictCheckIn = settings.requireCheckInLocation;
    const softCheckIn = !strictCheckIn && settings.requireLocation;
    let isOutsideZone = false;
    let matchedZoneName: string | null = null;
    if (strictCheckIn || softCheckIn) {
      if (!dto.latitude || !dto.longitude) {
        throw new BadRequestException('يجب تفعيل الموقع الجغرافي لتسجيل الحضور');
      }
      const employeeZones = await this.getEmployeeZones(userId);
      const locationCheck = this.validateLocationInZonesList(dto.latitude, dto.longitude, employeeZones);
      if (!locationCheck.valid) {
        if (strictCheckIn) {
          throw new BadRequestException('أنت خارج نطاق المناطق المسموحة لتسجيل الحضور. يجب التواجد في إحدى مناطق العمل المحددة');
        }
        if (!dto.forceCheckIn) {
          throw new BadRequestException('أنت خارج نطاق المناطق المسموحة لتسجيل الحضور. يرجى التواجد في إحدى مناطق العمل المحددة');
        }
        isOutsideZone = true;
      } else if (locationCheck.zoneName) {
        matchedZoneName = locationCheck.zoneName;
      }
    } else if (dto.latitude && dto.longitude) {
      // حتى بدون إلزام الموقع، نحاول تحديد اسم النقطة
      const employeeZones = await this.getEmployeeZones(userId);
      const locationCheck = this.validateLocationInZonesList(dto.latitude, dto.longitude, employeeZones);
      if (locationCheck.valid && locationCheck.zoneName) {
        matchedZoneName = locationCheck.zoneName;
      }
    }

    const now = new Date();
    const todayUTC = getTodayDateUTC(tz);
    const { start: rangeStart, end: rangeEnd } = getTodayRange(tz);

    // التحقق من العطلة الأسبوعية (باستخدام الإعدادات الفعلية للموظف)
    let isHolidayCheckIn = false;
    let holidayReason = '';
    const todayDay = todayDayForSchedule;
    const offDays = effective.weeklyOffDays;
    if (offDays.includes(todayDay)) {
      if (!dto.forceCheckIn) {
        throw new BadRequestException('اليوم يوم عطلة أسبوعية');
      }
      isHolidayCheckIn = true;
      holidayReason = 'عطلة أسبوعية';
    }

    // التحقق من العطلات الرسمية (يوم واحد أو فترة)
    const holiday = await this.prisma.staffHoliday.findFirst({
      where: {
        OR: [
          { date: { gte: rangeStart, lt: rangeEnd } },
          { date: { lte: rangeStart }, endDate: { gte: rangeStart } },
        ],
      },
    });
    if (holiday) {
      if (!dto.forceCheckIn) {
        throw new BadRequestException(`اليوم إجازة رسمية: ${holiday.name}`);
      }
      isHolidayCheckIn = true;
      holidayReason = `إجازة رسمية: ${holiday.name}`;
    }

    // التحقق من عدم وجود تسجيل سابق
    const existing = await this.prisma.staffAttendanceLog.findFirst({
      where: {
        userId,
        date: { gte: rangeStart, lt: rangeEnd },
      },
    });
    if (existing && existing.checkInTime) {
      throw new BadRequestException('تم تسجيل الحضور بالفعل اليوم');
    }

    // حساب التأخير — بناءً على الإعدادات الفعلية للموظف
    const isLate = isLateNow(effective.workStartTime, effective.lateThresholdMinutes, tz);

    const requiredMinutes = Math.round(effective.workHoursPerDay * 60);

    // إعداد ملاحظات التسجيل الإجباري
    const forceNotes: string[] = [];
    if (isOutsideZone) forceNotes.push('تسجيل من خارج النطاق المسموح');
    if (isHolidayCheckIn) forceNotes.push(`تسجيل أثناء ${holidayReason}`);
    const notesText = forceNotes.length > 0 ? forceNotes.join(' | ') : undefined;

    if (existing) {
      // تحديث السجل الموجود (مثلاً تم إنشاؤه بواسطة Cron)
      return this.prisma.staffAttendanceLog.update({
        where: { id: existing.id },
        data: {
          status: 'PRESENT',
          checkInTime: now,
          checkInLatitude: dto.latitude,
          checkInLongitude: dto.longitude,
          checkInAddress: dto.address,
          checkInZoneName: matchedZoneName,
          isLate,
          requiredMinutes,
          ...(notesText && { notes: notesText }),
        },
      });
    }

    // إنشاء سجل جديد مع معالجة خطأ القيد الفريد (مشكلة التوقيت)
    try {
      return await this.prisma.staffAttendanceLog.create({
        data: {
          userId,
          date: todayUTC,
          status: 'PRESENT',
          checkInTime: now,
          checkInLatitude: dto.latitude,
          checkInLongitude: dto.longitude,
          checkInAddress: dto.address,
          checkInZoneName: matchedZoneName,
          isLate,
          requiredMinutes,
          ...(notesText && { notes: notesText }),
        },
      });
    } catch (error: any) {
      // إذا فشل الإنشاء بسبب القيد الفريد، نبحث عن السجل ونحدثه
      if (error.code === 'P2002') {
        const retryFind = await this.prisma.staffAttendanceLog.findFirst({
          where: { userId, date: { gte: rangeStart, lt: rangeEnd } },
        });
        if (retryFind) {
          if (retryFind.checkInTime) {
            throw new BadRequestException('تم تسجيل الحضور بالفعل اليوم');
          }
          return this.prisma.staffAttendanceLog.update({
            where: { id: retryFind.id },
            data: {
              status: 'PRESENT',
              checkInTime: now,
              checkInLatitude: dto.latitude,
              checkInLongitude: dto.longitude,
              checkInAddress: dto.address,
              checkInZoneName: matchedZoneName,
              isLate,
              requiredMinutes,
              ...(notesText && { notes: notesText }),
            },
          });
        }
      }
      throw error;
    }
  }

  async checkOut(userId: string, dto: CheckOutDto) {
    const settings = await this.getSettings();
    const tz = this.getTimezone(settings);
    const { start: rangeStart, end: rangeEnd } = getTodayRange(tz);

    const log = await this.prisma.staffAttendanceLog.findFirst({
      where: {
        userId,
        date: { gte: rangeStart, lt: rangeEnd },
      },
    });
    if (!log || !log.checkInTime) {
      throw new BadRequestException('لم يتم تسجيل الحضور اليوم بعد');
    }
    if (log.checkOutTime) {
      throw new BadRequestException('تم تسجيل الانصراف بالفعل');
    }

    // التحقق من الموقع الجغرافي إذا كان مطلوباً (للانصراف) — باستخدام المناطق المخصصة للموظف
    const strictCheckOut = settings.requireCheckOutLocation;
    if (strictCheckOut) {
      if (!dto.latitude || !dto.longitude) {
        throw new BadRequestException('يجب تفعيل الموقع الجغرافي لتسجيل الانصراف');
      }
      const employeeZones = await this.getEmployeeZones(userId);
      const locationCheck = this.validateLocationInZonesList(dto.latitude, dto.longitude, employeeZones);
      if (!locationCheck.valid) {
        throw new BadRequestException('أنت خارج نطاق المناطق المسموحة لتسجيل الانصراف. يجب التواجد في إحدى مناطق العمل المحددة');
      }
    }

    const checkOutNow = new Date();
    const workedMs = checkOutNow.getTime() - log.checkInTime.getTime();
    const workedMinutes = Math.round(workedMs / 60000);

    // استخدام الإعدادات الفعلية للموظف
    const todayDayForSchedule = getCurrentDayName(tz);
    const effective = await this.getEffectiveSettings(userId, settings, todayDayForSchedule);
    const requiredMinutes = log.requiredMinutes || Math.round(effective.workHoursPerDay * 60);
    const isEarlyLeave = workedMinutes < (requiredMinutes - effective.earlyLeaveThreshold);
    const overtimeMinutes = Math.max(0, workedMinutes - requiredMinutes);

    return this.prisma.staffAttendanceLog.update({
      where: { id: log.id },
      data: {
        checkOutTime: checkOutNow,
        checkOutLatitude: dto.latitude,
        checkOutLongitude: dto.longitude,
        checkOutAddress: dto.address,
        workedMinutes,
        isEarlyLeave,
        overtimeMinutes,
      },
    });
  }

  async getMyStatus(userId: string) {
    const settings = await this.getSettings();
    const tz = this.getTimezone(settings);
    const { start: rangeStart, end: rangeEnd } = getTodayRange(tz);

    const log = await this.prisma.staffAttendanceLog.findFirst({
      where: {
        userId,
        date: { gte: rangeStart, lt: rangeEnd },
      },
    });

    const enrollment = await this.prisma.staffAttendanceEnrollment.findUnique({
      where: { userId },
    });

    // جلب المناطق المسموحة للموظف (عامة + مخصصة)
    const zones = await this.getEmployeeZones(userId);

    // الإعدادات الفعلية للموظف
    const todayDay = getCurrentDayName(tz);
    const effective = await this.getEffectiveSettings(userId, settings, todayDay);

    // التحقق من العطلات اليوم (باستخدام أيام الإجازة الفعلية للموظف)
    const isWeeklyOff = effective.weeklyOffDays.includes(todayDay);

    const todayHoliday = await this.prisma.staffHoliday.findFirst({
      where: {
        OR: [
          { date: { gte: rangeStart, lt: rangeEnd } },
          { date: { lte: rangeStart }, endDate: { gte: rangeStart } },
        ],
      },
      select: { id: true, name: true, date: true, endDate: true },
    });

    return {
      isEnrolled: !!enrollment?.isActive,
      systemActive: settings.isActive,
      todayLog: log,
      isWeeklyOff,
      weeklyOffDay: isWeeklyOff ? todayDay : null,
      todayHoliday: todayHoliday || null,
      settings: {
        workHoursPerDay: effective.workHoursPerDay,
        workStartTime: effective.workStartTime,
        workEndTime: effective.workEndTime,
        lateThresholdMinutes: effective.lateThresholdMinutes,
        requireLocation: settings.requireLocation ?? false,
        requireCheckInLocation: settings.requireCheckInLocation ?? false,
        requireCheckOutLocation: settings.requireCheckOutLocation ?? false,
        locationLatitude: settings.locationLatitude,
        locationLongitude: settings.locationLongitude,
        locationRadius: settings.locationRadius ?? 200,
        timezone: tz,
        zones: zones.map(z => ({ id: z.id, name: z.name, latitude: z.latitude, longitude: z.longitude, radius: z.radius, color: z.color })),
      },
      // معلومات الجدول المخصص للموظف
      customSchedule: enrollment ? {
        customWorkDays: enrollment.customWorkDays,
        customWorkStartTime: enrollment.customWorkStartTime,
        customWorkEndTime: enrollment.customWorkEndTime,
        customWorkHoursPerDay: enrollment.customWorkHoursPerDay,
        customDaySchedules: enrollment.customDaySchedules,
      } : null,
    };
  }

  async getMyLogs(userId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.staffAttendanceLog.findMany({
        where: { userId },
        include: {
          user: { select: { id: true, name: true, email: true, photoUrl: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.staffAttendanceLog.count({ where: { userId } }),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // =============== إدارة السجلات (للإدارة) ===============

  async getAllLogs(filters: {
    userId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, startDate, endDate, status, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.staffAttendanceLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, photoUrl: true } },
        },
        orderBy: [{ date: 'desc' }, { checkInTime: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.staffAttendanceLog.count({ where }),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserLogs(userId: string, startDate?: string, endDate?: string) {
    const where: any = { userId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const logs = await this.prisma.staffAttendanceLog.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // إحصائيات
    const totalDays = logs.length;
    const presentDays = logs.filter(l => l.status === 'PRESENT').length;
    const absentDays = logs.filter(l => l.status === 'ABSENT_UNEXCUSED').length;
    const excusedDays = logs.filter(l => l.status === 'LEAVE' || l.status === 'ABSENT_EXCUSED').length;
    const lateDays = logs.filter(l => l.isLate).length;
    const earlyLeaveDays = logs.filter(l => l.isEarlyLeave).length;
    const totalWorkedMinutes = logs.reduce((sum, l) => sum + (l.workedMinutes || 0), 0);
    const totalRequiredMinutes = logs.reduce((sum, l) => sum + (l.requiredMinutes || 0), 0);
    const totalOvertimeMinutes = logs.reduce((sum, l) => sum + (l.overtimeMinutes || 0), 0);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, photoUrl: true },
    });

    return {
      user,
      logs,
      stats: {
        totalDays,
        presentDays,
        absentDays,
        excusedDays,
        lateDays,
        earlyLeaveDays,
        totalWorkedMinutes,
        totalRequiredMinutes,
        totalOvertimeMinutes,
        attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
      },
    };
  }

  async getTodayAttendance() {
    const settings = await this.getSettings();
    const tz = this.getTimezone(settings);
    const today = getTodayDateUTC(tz);
    const todayDay = getCurrentDayName(tz);

    const enrollments = await this.prisma.staffAttendanceEnrollment.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true, photoUrl: true, phone: true } },
      },
    });

    const todayLogs = await this.prisma.staffAttendanceLog.findMany({
      where: { date: today },
    });

    // التحقق من العطلة الرسمية اليوم
    const { start: rangeStart, end: rangeEnd } = getTodayRange(tz);
    const todayHoliday = await this.prisma.staffHoliday.findFirst({
      where: {
        OR: [
          { date: { gte: rangeStart, lt: rangeEnd } },
          { date: { lte: rangeStart }, endDate: { gte: rangeStart } },
        ],
      },
    });

    const logMap = new Map<string, (typeof todayLogs)[0]>(todayLogs.map(l => [l.userId, l]));

    // طلبات الإجازة المقبولة التي تشمل اليوم
    const approvedLeaves = await this.prisma.staffLeaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: { userId: true, leaveType: true },
    });
    const approvedLeaveMap = new Map(approvedLeaves.map(l => [l.userId, l]));

    // الأيام الافتراضية
    const globalOffDays = (settings.weeklyOffDays || []) as string[];
    const allDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    const employees = enrollments.map(e => {
      const log = logMap.get(e.userId) || null;

      // حساب أيام الإجازة الفعلية للموظف
      let employeeOffDays = globalOffDays;
      if (e.customWorkDays && Array.isArray(e.customWorkDays) && (e.customWorkDays as string[]).length > 0) {
        const workDays = (e.customWorkDays as string[]).map(d => d.toUpperCase());
        employeeOffDays = allDays.filter(d => !workDays.includes(d));
      }
      // إذا يوجد جدول مخصص لكل يوم، الأيام الموجودة في الجدول هي أيام العمل
      const empDaySchedules = e.customDaySchedules as Record<string, any> | null;
      if (empDaySchedules && Object.keys(empDaySchedules).length > 0) {
        const scheduledDays = Object.keys(empDaySchedules).map(d => d.toUpperCase());
        employeeOffDays = allDays.filter(d => !scheduledDays.includes(d));
      }

      const isDayOff = employeeOffDays.includes(todayDay) || !!todayHoliday;
      const hasApprovedLeave = approvedLeaveMap.has(e.userId);

      // تحديد الحالة بأولوية: سجل فعلي > إجازة مقبولة > يوم عطلة > لم يسجل
      let status = log?.status || 'NOT_RECORDED';
      if (!log && hasApprovedLeave) {
        status = 'ON_LEAVE';
      } else if (!log && isDayOff) {
        status = 'DAY_OFF';
      }

      return {
        user: e.user,
        log,
        status,
      };
    });

    const present = employees.filter(e => e.status === 'PRESENT').length;
    const absent = employees.filter(e => e.status === 'ABSENT_UNEXCUSED').length;
    const excused = employees.filter(e => e.status === 'LEAVE' || e.status === 'ABSENT_EXCUSED').length;
    const onLeave = employees.filter(e => e.status === 'ON_LEAVE').length;
    const notRecorded = employees.filter(e => e.status === 'NOT_RECORDED').length;
    const dayOff = employees.filter(e => e.status === 'DAY_OFF').length;
    const late = todayLogs.filter(l => l.isLate).length;

    return {
      date: today,
      employees,
      stats: {
        total: enrollments.length,
        present,
        absent,
        excused,
        onLeave,
        notRecorded,
        dayOff,
        late,
      },
    };
  }

  async manualRecord(dto: ManualRecordDto, adminId: string) {
    const settings = await this.getSettings();
    const tz = this.getTimezone(settings);

    // الإعدادات الفعلية للموظف — حساب يوم الأسبوع من التاريخ المحدد
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const refDate = new Date(dto.date);
    const refDayName = dayNames[refDate.getUTCDay()];
    const effective = await this.getEffectiveSettings(dto.userId, settings, refDayName);

    const date = new Date(dto.date);
    date.setUTCHours(0, 0, 0, 0);

    const data: any = {
      userId: dto.userId,
      date,
      status: dto.status,
      recordedBy: adminId,
      notes: dto.notes,
    };

    // بناء أوقات الحضور/الانصراف بالمنطقة الزمنية الصحيحة
    const dateStr = dto.date; // 'YYYY-MM-DD'
    if (dto.checkInTime) {
      data.checkInTime = buildDateTimeInTz(dateStr, dto.checkInTime, tz);
    }

    if (dto.checkOutTime) {
      data.checkOutTime = buildDateTimeInTz(dateStr, dto.checkOutTime, tz);

      if (data.checkInTime) {
        data.workedMinutes = Math.round((data.checkOutTime.getTime() - data.checkInTime.getTime()) / 60000);
        // حساب الأوفرتايم
        const reqMin = Math.round(effective.workHoursPerDay * 60);
        data.overtimeMinutes = Math.max(0, data.workedMinutes - reqMin);
      }
    }

    data.requiredMinutes = Math.round(effective.workHoursPerDay * 60);

    return this.prisma.staffAttendanceLog.upsert({
      where: { userId_date: { userId: dto.userId, date } },
      create: data,
      update: data,
    });
  }

  async updateLog(logId: string, dto: UpdateLogDto) {
    const log = await this.prisma.staffAttendanceLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('السجل غير موجود');

    const settings = await this.getSettings();
    const tz = this.getTimezone(settings);

    const updates: any = {};
    if (dto.status) updates.status = dto.status;
    if (dto.notes !== undefined) updates.notes = dto.notes;
    
    // نستخرج تاريخ السجل كنص YYYY-MM-DD لاستخدامه مع buildDateTimeInTz
    const logDateStr = log.date.toISOString().split('T')[0];

    if (dto.checkInTime) {
      updates.checkInTime = buildDateTimeInTz(logDateStr, dto.checkInTime, tz);
    }

    if (dto.checkOutTime) {
      updates.checkOutTime = buildDateTimeInTz(logDateStr, dto.checkOutTime, tz);
    }

    // إعادة حساب الدقائق
    const finalCheckIn = updates.checkInTime || log.checkInTime;
    const finalCheckOut = updates.checkOutTime || log.checkOutTime;
    if (finalCheckIn && finalCheckOut) {
      updates.workedMinutes = Math.round((finalCheckOut.getTime() - finalCheckIn.getTime()) / 60000);
    }

    return this.prisma.staffAttendanceLog.update({
      where: { id: logId },
      data: updates,
    });
  }

  // =============== أذونات الغياب ===============

  async getLeaveRequests(filters: { userId?: string; status?: string }) {
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;

    return this.prisma.staffLeaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, photoUrl: true } },
        reviewedByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyLeaves(userId: string, status?: string) {
    const where: any = { userId };
    if (status) where.status = status;

    return this.prisma.staffLeaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, photoUrl: true } },
        reviewedByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLeaveRequest(userId: string, dto: CreateLeaveRequestDto) {
    return this.prisma.staffLeaveRequest.create({
      data: {
        userId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
        leaveType: dto.leaveType || 'PERSONAL',
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async reviewLeaveRequest(requestId: string, reviewerId: string, dto: ReviewLeaveRequestDto) {
    const request = await this.prisma.staffLeaveRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('طلب الإذن غير موجود');
    if (request.status !== 'PENDING') throw new BadRequestException('تمت مراجعة هذا الطلب مسبقاً');

    const updated = await this.prisma.staffLeaveRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // إذا تمت الموافقة، نسجل أيام الإذن
    if (dto.status === 'APPROVED') {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        
        await this.prisma.staffAttendanceLog.upsert({
          where: { userId_date: { userId: request.userId, date } },
          create: {
            userId: request.userId,
            date,
            status: 'LEAVE',
            notes: `إذن: ${request.reason}`,
          },
          update: {
            status: 'LEAVE',
            notes: `إذن: ${request.reason}`,
          },
        });
      }
    }

    return updated;
  }

  // =============== العطلات ===============

  async getHolidays() {
    return this.prisma.staffHoliday.findMany({
      orderBy: { date: 'asc' },
    });
  }

  async createHoliday(dto: CreateHolidayDto, creatorId: string) {
    return this.prisma.staffHoliday.create({
      data: {
        name: dto.name,
        date: new Date(dto.date),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        isRecurring: dto.isRecurring || false,
        notes: dto.notes,
        createdBy: creatorId,
      },
    });
  }

  async updateHoliday(id: string, dto: UpdateHolidayDto) {
    const holiday = await this.prisma.staffHoliday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('العطلة غير موجودة');

    return this.prisma.staffHoliday.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.isRecurring !== undefined && { isRecurring: dto.isRecurring }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async deleteHoliday(id: string) {
    const holiday = await this.prisma.staffHoliday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('العطلة غير موجودة');
    return this.prisma.staffHoliday.delete({ where: { id } });
  }

  // =============== مناطق الحضور المسموحة ===============

  async getZones() {
    return this.prisma.staffAttendanceZone.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        enrollments: {
          include: {
            enrollment: {
              select: {
                id: true,
                allowGlobalZones: true,
                user: { select: { id: true, name: true, photoUrl: true } },
              },
            },
          },
        },
      },
    });
  }

  async createZone(dto: CreateZoneDto) {
    const { employeeIds, ...zoneData } = dto;
    const zone = await this.prisma.staffAttendanceZone.create({
      data: {
        name: zoneData.name,
        latitude: zoneData.latitude,
        longitude: zoneData.longitude,
        radius: zoneData.radius || 200,
        color: zoneData.color || '#6366F1',
        isGlobal: zoneData.isGlobal ?? true,
      },
    });

    // ربط الموظفين بالمنطقة المخصصة
    if (employeeIds && employeeIds.length > 0 && !zone.isGlobal) {
      const enrollments = await this.prisma.staffAttendanceEnrollment.findMany({
        where: { userId: { in: employeeIds }, isActive: true },
        select: { id: true },
      });
      if (enrollments.length > 0) {
        await this.prisma.staffEnrollmentZone.createMany({
          data: enrollments.map(e => ({ enrollmentId: e.id, zoneId: zone.id })),
          skipDuplicates: true,
        });
      }
    }

    return this.prisma.staffAttendanceZone.findUnique({
      where: { id: zone.id },
      include: {
        enrollments: {
          include: {
            enrollment: {
              include: { user: { select: { id: true, name: true, photoUrl: true } } },
            },
          },
        },
      },
    });
  }

  async updateZone(id: string, dto: UpdateZoneDto) {
    const zone = await this.prisma.staffAttendanceZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('المنطقة غير موجودة');

    const { employeeIds, ...restDto } = dto;

    await this.prisma.staffAttendanceZone.update({
      where: { id },
      data: {
        ...(restDto.name !== undefined && { name: restDto.name }),
        ...(restDto.latitude !== undefined && { latitude: restDto.latitude }),
        ...(restDto.longitude !== undefined && { longitude: restDto.longitude }),
        ...(restDto.radius !== undefined && { radius: restDto.radius }),
        ...(restDto.color !== undefined && { color: restDto.color }),
        ...(restDto.isActive !== undefined && { isActive: restDto.isActive }),
        ...(restDto.isGlobal !== undefined && { isGlobal: restDto.isGlobal }),
      },
    });

    // تحديث ربط الموظفين بالمنطقة
    if (employeeIds !== undefined) {
      // حذف جميع الربط القديم
      await this.prisma.staffEnrollmentZone.deleteMany({ where: { zoneId: id } });
      // إنشاء الربط الجديد
      if (employeeIds.length > 0) {
        const enrollments = await this.prisma.staffAttendanceEnrollment.findMany({
          where: { userId: { in: employeeIds }, isActive: true },
          select: { id: true },
        });
        if (enrollments.length > 0) {
          await this.prisma.staffEnrollmentZone.createMany({
            data: enrollments.map(e => ({ enrollmentId: e.id, zoneId: id })),
            skipDuplicates: true,
          });
        }
      }
    }

    return this.prisma.staffAttendanceZone.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            enrollment: {
              include: { user: { select: { id: true, name: true, photoUrl: true } } },
            },
          },
        },
      },
    });
  }

  async deleteZone(id: string) {
    const zone = await this.prisma.staffAttendanceZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('المنطقة غير موجودة');
    return this.prisma.staffAttendanceZone.delete({ where: { id } });
  }

  // =============== الداشبورد ===============

  async getDashboardStats() {
    const settings = await this.getSettings();
    const tz = this.getTimezone(settings);
    const today = getTodayDateUTC(tz);
    
    const { start: monthStart, end: monthEnd } = getMonthRange(tz);

    const [
      totalEnrolled,
      todayData,
      monthLogs,
      pendingLeaves,
    ] = await Promise.all([
      this.prisma.staffAttendanceEnrollment.count({ where: { isActive: true } }),
      this.getTodayAttendance(),
      this.prisma.staffAttendanceLog.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.staffLeaveRequest.count({ where: { status: 'PENDING' } }),
    ]);

    const monthPresent = monthLogs.filter(l => l.status === 'PRESENT').length;
    const monthAbsent = monthLogs.filter(l => l.status === 'ABSENT_UNEXCUSED').length;
    const monthLate = monthLogs.filter(l => l.isLate).length;
    const totalWorkedHours = Math.round(monthLogs.reduce((s, l) => s + (l.workedMinutes || 0), 0) / 60);

    return {
      totalEnrolled,
      today: todayData.stats,
      month: {
        presentDays: monthPresent,
        absentDays: monthAbsent,
        lateDays: monthLate,
        totalWorkedHours,
        attendanceRate: monthLogs.length > 0 ? Math.round((monthPresent / monthLogs.length) * 100) : 0,
      },
      pendingLeaves,
    };
  }

  // =============== Cron Job - تسجيل الغياب التلقائي ===============

  @Cron('0 59 23 * * *') // كل يوم الساعة 23:59
  async autoRecordAbsences() {
    console.log('🕐 [Staff Attendance] بدء تسجيل الغياب التلقائي...');
    
    const settings = await this.getSettings();
    if (!settings.isActive) return;

    const tz = this.getTimezone(settings);
    const todayUTC = getTodayDateUTC(tz);
    const { start: rangeStart, end: rangeEnd } = getTodayRange(tz);

    const todayDay = getCurrentDayName(tz);
    
    // التحقق من العطلة الرسمية
    const holiday = await this.prisma.staffHoliday.findFirst({ where: { date: { gte: rangeStart, lt: rangeEnd } } });

    const enrollments = await this.prisma.staffAttendanceEnrollment.findMany({
      where: { isActive: true },
    });

    for (const enrollment of enrollments) {
      // الإعدادات الفعلية لكل موظف
      const effective = await this.getEffectiveSettings(enrollment.userId, settings, todayDay);
      const employeeOffDays = effective.weeklyOffDays;

      const existing = await this.prisma.staffAttendanceLog.findFirst({
        where: {
          userId: enrollment.userId,
          date: { gte: rangeStart, lt: rangeEnd },
        },
      });

      if (!existing) {
        // أيام الإجازة الأسبوعية (المخصصة للموظف) والرسمية لا تُسجَّل كغياب
        if (employeeOffDays.includes(todayDay) || holiday) {
          continue;
        }

        let status: any = 'ABSENT_UNEXCUSED';
        let notes = '';

        // التحقق من وجود إذن معتمد
        const approvedLeave = await this.prisma.staffLeaveRequest.findFirst({
          where: {
            userId: enrollment.userId,
            status: 'APPROVED',
            startDate: { lte: rangeEnd },
            endDate: { gte: rangeStart },
          },
        });
        if (approvedLeave) {
          status = 'LEAVE';
          notes = `إذن: ${approvedLeave.reason}`;
        }

        await this.prisma.staffAttendanceLog.create({
          data: {
            userId: enrollment.userId,
            date: todayUTC,
            status,
            notes,
            requiredMinutes: Math.round(effective.workHoursPerDay * 60),
          },
        });
      } else if (existing.status === 'PRESENT' && existing.checkInTime && !existing.checkOutTime) {
        // موظف سجل حضور ولم يسجل انصراف — نحسب وقت الانصراف بالمنطقة الزمنية الصحيحة
        const autoCheckOut = buildTimeToday(effective.workEndTime, tz);
        
        const workedMs = autoCheckOut.getTime() - existing.checkInTime.getTime();
        const workedMinutes = Math.max(0, Math.round(workedMs / 60000));
        const requiredMinutes = existing.requiredMinutes || Math.round(effective.workHoursPerDay * 60);
        const overtimeMinutes = Math.max(0, workedMinutes - requiredMinutes);

        await this.prisma.staffAttendanceLog.update({
          where: { id: existing.id },
          data: {
            checkOutTime: autoCheckOut,
            workedMinutes,
            overtimeMinutes,
            notes: (existing.notes || '') + ' (انصراف تلقائي)',
          },
        });
      }
    }

    console.log('✅ [Staff Attendance] تم تسجيل الغياب التلقائي');
  }
}
