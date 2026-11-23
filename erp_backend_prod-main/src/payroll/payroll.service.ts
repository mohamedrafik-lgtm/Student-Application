import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAY_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const dateKey = (value: Date) => value.toISOString().slice(0, 10);

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    return (await this.prisma.payrollSettings.findFirst()) || this.prisma.payrollSettings.create({ data: {} });
  }

  async updateSettings(advanceLimitPercent: number) {
    if (!Number.isFinite(advanceLimitPercent) || advanceLimitPercent < 0 || advanceLimitPercent > 100) {
      throw new BadRequestException('نسبة الحد الأقصى للسلف يجب أن تكون بين 0 و100%');
    }
    const existing = await this.prisma.payrollSettings.findFirst();
    return existing
      ? this.prisma.payrollSettings.update({ where: { id: existing.id }, data: { advanceLimitPercent } })
      : this.prisma.payrollSettings.create({ data: { advanceLimitPercent } });
  }

  async listProfiles() {
    const [users, profiles] = await Promise.all([
      this.prisma.user.findMany({
        where: { accountType: 'STAFF', isArchived: false },
        select: { id: true, name: true, email: true, phone: true, isActive: true, isArchived: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.payrollProfile.findMany({
        include: { components: { orderBy: { order: 'asc' } }, salaryChanges: { orderBy: { effectiveAt: 'desc' }, take: 5 } },
      }),
    ]);
    const profileByUser = new Map(profiles.map((profile) => [profile.userId, profile]));
    return users.map((user) => ({ ...user, payrollProfile: profileByUser.get(user.id) || null }));
  }

  async saveProfile(input: {
    userId: string; baseSalary: number; kpiEnabled: boolean; kpiAmount: number;
    effectiveFrom?: string; notes?: string; components: Array<{ name: string; percentage: number; attendanceBased?: boolean }>;
    salaryChangeReason?: string;
  }, changedById: string) {
    if (!input.userId || !Number.isFinite(input.baseSalary) || input.baseSalary < 0) throw new BadRequestException('بيانات الموظف أو الراتب الأساسي غير صحيحة');
    if (!Number.isFinite(input.kpiAmount) || input.kpiAmount < 0) throw new BadRequestException('القيمة الافتراضية لـ KPI غير صحيحة');
    if (!Array.isArray(input.components) || input.components.length === 0) throw new BadRequestException('أضف مكوناً واحداً على الأقل لتقسيم الراتب');
    if (input.components.some((item) => !item.name?.trim() || !Number.isFinite(item.percentage) || item.percentage < 0)) throw new BadRequestException('تحقق من أسماء ونسب أجزاء الراتب');
    const componentTotalPercent = input.components.reduce((total, item) => total + item.percentage, 0);
    if (Math.abs(componentTotalPercent - 100) > 0.01) throw new BadRequestException(`مجموع نسب تقسيم الراتب يجب أن يساوي 100% (الحالي ${roundMoney(componentTotalPercent)}%)`);

    const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, accountType: true, isArchived: true } });
    if (!user || user.accountType !== 'STAFF' || user.isArchived) throw new NotFoundException('الموظف غير موجود أو حسابه مؤرشف');
    const existing = await this.prisma.payrollProfile.findUnique({ where: { userId: input.userId } });
    const effectiveFrom = input.effectiveFrom ? new Date(`${input.effectiveFrom}T00:00:00.000Z`) : new Date();
    if (Number.isNaN(effectiveFrom.getTime())) throw new BadRequestException('تاريخ بدء الراتب غير صحيح');
    if (existing && Math.abs(existing.baseSalary - input.baseSalary) > 0.005 && !input.salaryChangeReason?.trim()) {
      throw new BadRequestException('اكتب سبب تعديل الراتب لحفظه في سجل تغييرات الرواتب');
    }

    return this.prisma.$transaction(async (tx) => {
      const profile = existing
        ? await tx.payrollProfile.update({
            where: { id: existing.id },
            data: {
              baseSalary: input.baseSalary,
              kpiEnabled: input.kpiEnabled,
              kpiAmount: input.kpiAmount,
              effectiveFrom: Math.abs(existing.baseSalary - input.baseSalary) > 0.005 ? effectiveFrom : existing.effectiveFrom,
              notes: input.notes || null,
              isActive: true,
            },
          })
        : await tx.payrollProfile.create({
            data: { userId: input.userId, baseSalary: input.baseSalary, kpiEnabled: input.kpiEnabled, kpiAmount: input.kpiAmount, effectiveFrom, notes: input.notes || null },
          });
      if (existing && Math.abs(existing.baseSalary - input.baseSalary) > 0.005) {
        await tx.payrollSalaryChange.create({
          data: { profileId: profile.id, oldSalary: existing.baseSalary, newSalary: input.baseSalary, reason: input.salaryChangeReason!.trim(), effectiveAt: effectiveFrom, changedById },
        });
      } else if (!existing) {
        await tx.payrollSalaryChange.create({
          data: { profileId: profile.id, oldSalary: 0, newSalary: input.baseSalary, reason: 'إنشاء ملف الراتب الأساسي', effectiveAt: effectiveFrom, changedById },
        });
      }
      await tx.payrollSalaryComponent.deleteMany({ where: { profileId: profile.id } });
      await tx.payrollSalaryComponent.createMany({
        data: input.components.map((component, order) => ({ profileId: profile.id, name: component.name.trim(), percentage: component.percentage, attendanceBased: component.attendanceBased === true, order })),
      });
      return tx.payrollProfile.findUnique({ where: { id: profile.id }, include: { components: { orderBy: { order: 'asc' } } } });
    });
  }

  async setProfileActive(profileId: string, isActive: boolean) {
    const profile = await this.prisma.payrollProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('ملف الراتب غير موجود');
    return this.prisma.payrollProfile.update({ where: { id: profileId }, data: { isActive } });
  }

  private async attendanceForUser(
    user: { id: string; staffAttendanceEnrollment: any },
    year: number,
    month: number,
    settings: any,
    holidays: any[],
    activeFrom?: Date,
  ) {
    const rangeStart = new Date(Date.UTC(year, month - 1, 1));
    const rangeEnd = new Date(Date.UTC(year, month, 0));
    const now = new Date();
    const isCurrentMonth = now.getUTCFullYear() === year && now.getUTCMonth() + 1 === month;
    const endDay = isCurrentMonth ? Math.min(now.getUTCDate(), rangeEnd.getUTCDate()) : rangeEnd.getUTCDate();
    const [logs, approvedLeaves] = await Promise.all([
      this.prisma.staffAttendanceLog.findMany({ where: { userId: user.id, date: { gte: rangeStart, lte: rangeEnd } }, select: { date: true, status: true, workedMinutes: true, requiredMinutes: true } }),
      this.prisma.staffLeaveRequest.findMany({ where: { userId: user.id, status: 'APPROVED', startDate: { lte: rangeEnd }, endDate: { gte: rangeStart } }, select: { startDate: true, endDate: true, leaveType: true } }),
    ]);
    const enrollment = user.staffAttendanceEnrollment;
    if (!enrollment?.isActive || settings?.isActive === false) {
      return { expectedWorkDays: 0, attendedWorkDays: 0, attendanceFactor: 1, excluded: { holidays: 0, approvedLeaves: 0, weeklyOffDays: 0 }, attendanceEnabled: false, evaluatedThrough: `${year}-${String(month).padStart(2, '0')}-${String(Math.min(endDay, rangeEnd.getUTCDate())).padStart(2, '0')}` };
    }
    const scheduledDays = Array.isArray(enrollment?.customWorkDays) && enrollment.customWorkDays.length
      ? enrollment.customWorkDays as string[]
      : DAY_KEYS.filter((day) => !(Array.isArray(settings?.weeklyOffDays) ? settings.weeklyOffDays : ['FRIDAY']).includes(day));
    const logMap = new Map(logs.map((log) => [dateKey(log.date), log]));
    let expectedWorkDays = 0;
    let attendedWorkDays = 0;
    const excluded = { holidays: 0, approvedLeaves: 0, weeklyOffDays: 0 };
    for (let day = 1; day <= endDay; day++) {
      const date = new Date(Date.UTC(year, month - 1, day));
      const key = dateKey(date);
      if (activeFrom && key < dateKey(activeFrom)) continue;
      if (!scheduledDays.includes(DAY_KEYS[date.getUTCDay()])) { excluded.weeklyOffDays++; continue; }
      const isHoliday = holidays.some((holiday) => {
        const start = dateKey(holiday.date);
        const end = holiday.endDate ? dateKey(holiday.endDate) : start;
        if (holiday.isRecurring) {
          const dateMonthDay = key.slice(5);
          const startMonthDay = start.slice(5);
          const endMonthDay = end.slice(5);
          return startMonthDay <= endMonthDay
            ? dateMonthDay >= startMonthDay && dateMonthDay <= endMonthDay
            : dateMonthDay >= startMonthDay || dateMonthDay <= endMonthDay;
        }
        return key >= start && key <= end;
      });
      if (isHoliday) { excluded.holidays++; continue; }
      const leave = approvedLeaves.find((item) => key >= dateKey(item.startDate) && key <= dateKey(item.endDate));
      if (leave) { excluded.approvedLeaves++; continue; }
      const log = logMap.get(key);
      if (log?.status === 'HOLIDAY') { excluded.holidays++; continue; }
      if (log?.status === 'DAY_OFF') { excluded.weeklyOffDays++; continue; }
      expectedWorkDays++;
      if (log?.status === 'PRESENT' || log?.status === 'LEAVE' || log?.status === 'ABSENT_EXCUSED') attendedWorkDays++;
    }
    const attendanceFactor = expectedWorkDays > 0 ? Math.min(1, attendedWorkDays / expectedWorkDays) : 1;
    return { expectedWorkDays, attendedWorkDays, attendanceFactor, excluded, evaluatedThrough: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}` };
  }

  private monthlyBaseSalary(profile: any, year: number, month: number) {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const changes = [...(profile.salaryChanges || [])].sort((a: any, b: any) => a.effectiveAt.getTime() - b.effectiveAt.getTime());
    const initialStart = profile.effectiveFrom ? dateKey(profile.effectiveFrom) : '0000-00-00';
    let total = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const key = dateKey(new Date(Date.UTC(year, month - 1, day)));
      if (key < initialStart) continue;
      let salary = profile.baseSalary;
      for (const change of changes) {
        if (dateKey(change.effectiveAt) <= key) salary = change.newSalary;
        else break;
      }
      total += salary;
    }
    return roundMoney(total / daysInMonth);
  }

  async generatePeriod(year: number, month: number, createdById: string) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new BadRequestException('السنة أو الشهر غير صحيح');
    const today = new Date();
    if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth() + 1)) {
      throw new BadRequestException('لا يمكن إعداد مسير راتب لشهر لم يبدأ بعد');
    }
    const existing = await this.prisma.payrollPeriod.findUnique({ where: { year_month: { year, month } }, include: { slips: { select: { id: true } } } });
    if (existing && existing.status !== 'DRAFT') throw new BadRequestException('لا يمكن إعادة إعداد مسير تم اعتماده أو إغلاقه');
    if (existing) {
      const approvedCount = await this.prisma.payrollSlip.count({ where: { periodId: existing.id, approvedAt: { not: null } } });
      if (approvedCount) throw new BadRequestException('لا يمكن إعادة إعداد مسير بعد اعتماد مفردات؛ أكمل اعتماد الموظفين المتبقين من المسير الحالي');
      const [payoutCount, adjustmentCount, existingSlips] = await Promise.all([
        this.prisma.payrollPayout.count({ where: { slip: { periodId: existing.id } } }),
        this.prisma.payrollAdjustment.count({ where: { slip: { periodId: existing.id } } }),
        this.prisma.payrollSlip.findMany({ where: { periodId: existing.id }, select: { kpiAmount: true, attendanceDetails: true } }),
      ]);
      const hasEnteredKpi = existingSlips.some((slip) => {
        const details = slip.attendanceDetails as any;
        return details?.kpiSpecified === true || (details?.kpiSpecified === undefined && slip.kpiAmount > 0);
      });
      if (payoutCount || adjustmentCount || hasEnteredKpi) throw new BadRequestException('لا يمكن إعادة إعداد مسير يحتوي على صرف أو تعديلات أو KPI مدخل؛ عدّل المسير الحالي بدلاً من إعادة إنشائه');
    }
    const [profiles, settings, holidays] = await Promise.all([
      this.prisma.payrollProfile.findMany({
        where: { isActive: true, user: { isActive: true, isArchived: false } },
        include: { components: { orderBy: { order: 'asc' } }, salaryChanges: { orderBy: { effectiveAt: 'asc' } }, user: { select: { id: true, staffAttendanceEnrollment: { select: { customWorkDays: true, isActive: true } } } } },
      }),
      this.prisma.staffAttendanceSettings.findFirst(),
      this.prisma.staffHoliday.findMany({ where: { OR: [
        { date: { gte: new Date(Date.UTC(year, month - 1, 1)), lte: new Date(Date.UTC(year, month, 0)) } },
        { endDate: { gte: new Date(Date.UTC(year, month - 1, 1)), lte: new Date(Date.UTC(year, month, 0)) } },
        { date: { lte: new Date(Date.UTC(year, month - 1, 1)) }, endDate: { gte: new Date(Date.UTC(year, month, 0)) } },
        { isRecurring: true },
      ] } }),
    ]);
    const slipData = await Promise.all(profiles.map(async (profile) => {
      const effectiveBaseSalary = this.monthlyBaseSalary(profile, year, month);
      const earliestSalaryDate = profile.salaryChanges[0]?.effectiveAt || profile.effectiveFrom;
      const attendance = await this.attendanceForUser(profile.user, year, month, settings, holidays, earliestSalaryDate);
      const items = profile.components.map((component) => {
        const nominalAmount = roundMoney(effectiveBaseSalary * component.percentage / 100);
        return { name: component.name, percentage: component.percentage, nominalAmount, payableAmount: roundMoney(nominalAmount * (component.attendanceBased ? attendance.attendanceFactor : 1)), attendanceBased: component.attendanceBased, order: component.order };
      });
      const componentTotal = roundMoney(items.reduce((sum, item) => sum + item.payableAmount, 0));
      // Use the employee's configured KPI default; the manager confirms or overrides it per month.
      const kpiAmount = profile.kpiEnabled ? profile.kpiAmount : 0;
      const grossAmount = roundMoney(componentTotal + kpiAmount);
      return { profileId: profile.id, userId: profile.userId, baseSalary: effectiveBaseSalary, componentTotal, kpiAmount, additions: 0, deductions: 0, grossAmount, netAmount: grossAmount, expectedWorkDays: attendance.expectedWorkDays, attendedWorkDays: attendance.attendedWorkDays, attendanceFactor: attendance.attendanceFactor, attendanceDetails: { ...attendance, kpiDefaultAmount: kpiAmount }, items };
    }));
    const period = await this.prisma.$transaction(async (tx) => {
      const row = existing
        ? await tx.payrollPeriod.update({ where: { id: existing.id }, data: { createdById, status: 'DRAFT', approvedById: null, approvedAt: null } })
        : await tx.payrollPeriod.create({ data: { year, month, createdById } });
      await tx.payrollSlip.deleteMany({ where: { periodId: row.id } });
      for (const slip of slipData) {
        const { items, attendanceDetails, ...data } = slip;
        await tx.payrollSlip.create({
          data: { ...data, periodId: row.id, attendanceDetails: { ...(attendanceDetails as any), kpiSpecified: false }, items: { create: items } },
        });
      }
      return tx.payrollPeriod.findUnique({ where: { id: row.id }, include: { _count: { select: { slips: true } } } });
    });
    return period;
  }

  async listPeriods() {
    return this.prisma.payrollPeriod.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: { _count: { select: { slips: true } }, slips: { select: { netAmount: true, paidAmount: true } } },
    }).then((periods) => periods.map((period) => ({
      ...period,
      totalNet: roundMoney(period.slips.reduce((sum, slip) => sum + slip.netAmount, 0)),
      totalPaid: roundMoney(period.slips.reduce((sum, slip) => sum + slip.paidAmount, 0)),
      remaining: roundMoney(period.slips.reduce((sum, slip) => sum + Math.max(0, slip.netAmount - slip.paidAmount), 0)),
      slips: undefined,
    })));
  }

  async getPeriod(periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: {
        createdBy: { select: { id: true, name: true } }, approvedBy: { select: { id: true, name: true } },
        slips: { include: { approvedBy: { select: { id: true, name: true } }, user: { select: { id: true, name: true, email: true, phone: true } }, profile: { select: { kpiEnabled: true, kpiAmount: true } }, items: { orderBy: { order: 'asc' } }, adjustments: { include: { createdBy: { select: { name: true } }, }, orderBy: { createdAt: 'asc' } }, payouts: { include: { safe: { select: { id: true, name: true } }, createdBy: { select: { name: true } }, transaction: { select: { id: true, createdAt: true, targetSafe: { select: { name: true } } } } }, orderBy: { createdAt: 'asc' } } }, orderBy: { user: { name: 'asc' } } },
      },
    });
    if (!period) throw new NotFoundException('مسير الرواتب غير موجود');
    return { ...period, slips: period.slips.map((slip) => ({ ...slip, approvedAt: slip.approvedAt ?? (period.status === 'APPROVED' || period.status === 'CLOSED' ? period.approvedAt : null), approvedBy: slip.approvedBy ?? (period.status === 'APPROVED' || period.status === 'CLOSED' ? period.approvedBy : null), kpiDefaultAmount: (slip.attendanceDetails as any)?.kpiDefaultAmount ?? slip.profile.kpiAmount, kpiSpecified: (slip.attendanceDetails as any)?.kpiSpecified === true, remainingAmount: roundMoney(Math.max(0, slip.netAmount - slip.paidAmount)), payoutStatus: slip.paidAmount >= slip.netAmount ? 'PAID' : slip.paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING' })) };
  }

  async addAdjustment(slipId: string, input: { type: 'ADDITION' | 'DEDUCTION'; amount: number; reason: string }, createdById: string) {
    if (!Number.isFinite(input.amount) || input.amount <= 0 || !input.reason?.trim()) throw new BadRequestException('أدخل مبلغاً موجباً وسبباً واضحاً للتعديل');
    const slip = await this.prisma.payrollSlip.findUnique({ where: { id: slipId }, include: { period: true } });
    if (!slip) throw new NotFoundException('مفردات الراتب غير موجودة');
    if (slip.period.status !== 'DRAFT' || slip.approvedAt) throw new BadRequestException('يمكن تعديل مفردات الراتب قبل اعتمادها فقط');
    return this.prisma.$transaction(async (tx) => {
      await tx.payrollAdjustment.create({ data: { slipId, type: input.type, amount: roundMoney(input.amount), reason: input.reason.trim(), createdById } });
      const aggregates = await tx.payrollAdjustment.groupBy({ by: ['type'], where: { slipId }, _sum: { amount: true } });
      const additions = aggregates.find((row) => row.type === 'ADDITION')?._sum.amount || 0;
      const deductions = aggregates.find((row) => row.type === 'DEDUCTION')?._sum.amount || 0;
      if (deductions > slip.grossAmount + additions) throw new BadRequestException('مجموع الخصومات يتجاوز إجمالي المستحق');
      return tx.payrollSlip.update({ where: { id: slipId }, data: { additions, deductions, netAmount: roundMoney(slip.grossAmount + additions - deductions) } });
    });
  }

  async setSlipKpi(slipId: string, amount: number) {
    if (!Number.isFinite(amount) || amount < 0) throw new BadRequestException('أدخل مبلغ KPI صحيحاً');
    const slip = await this.prisma.payrollSlip.findUnique({ where: { id: slipId }, include: { period: true, profile: { select: { kpiEnabled: true } } } });
    if (!slip) throw new NotFoundException('مفردات الراتب غير موجودة');
    if (slip.period.status !== 'DRAFT' || slip.approvedAt) throw new BadRequestException('يمكن تحديد KPI قبل اعتماد مفردة الراتب فقط');
    if (!slip.profile.kpiEnabled && amount > 0) throw new BadRequestException('فعّل KPI في ملف الموظف أولاً');
    const kpiAmount = roundMoney(amount);
    return this.prisma.$transaction(async (tx) => {
      const aggregates = await tx.payrollAdjustment.groupBy({ by: ['type'], where: { slipId }, _sum: { amount: true } });
      const additions = aggregates.find((row) => row.type === 'ADDITION')?._sum.amount || 0;
      const deductions = aggregates.find((row) => row.type === 'DEDUCTION')?._sum.amount || 0;
      const grossAmount = roundMoney(slip.componentTotal + kpiAmount);
      const netAmount = roundMoney(grossAmount + additions - deductions);
      const priorDetails = slip.attendanceDetails && typeof slip.attendanceDetails === 'object' && !Array.isArray(slip.attendanceDetails)
        ? slip.attendanceDetails as Record<string, unknown>
        : {};
      return tx.payrollSlip.update({
        where: { id: slipId },
        data: { kpiAmount, grossAmount, netAmount, attendanceDetails: { ...priorDetails, kpiSpecified: true } as any },
      });
    });
  }

  async approvePeriod(periodId: string, approvedById: string) {
    return this.approveSlips(periodId, undefined, approvedById);
  }

  async approveSlip(slipId: string, approvedById: string) {
    const slip = await this.prisma.payrollSlip.findUnique({ where: { id: slipId }, select: { id: true, periodId: true } });
    if (!slip) throw new NotFoundException('مفردات الراتب غير موجودة');
    return this.approveSlips(slip.periodId, [slip.id], approvedById);
  }

  async approveSlips(periodId: string, slipIds: string[] | undefined, approvedById: string) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException('مسير الرواتب غير موجود');
    if (period.status !== 'DRAFT') throw new BadRequestException('المسير ليس في حالة مسودة');
    const targetIds = slipIds?.length ? [...new Set(slipIds)] : undefined;
    const slips = await this.prisma.payrollSlip.findMany({
      where: { periodId, approvedAt: null, ...(targetIds ? { id: { in: targetIds } } : {}) },
      include: { profile: { select: { kpiEnabled: true } } },
    });
    if (!slips.length) throw new BadRequestException('لا يحتوي المسير على موظفين مستحقين');
    const missingKpiConfirmation = slips.some((slip) => slip.profile.kpiEnabled && (slip.attendanceDetails as any)?.kpiSpecified !== true);
    if (missingKpiConfirmation) throw new BadRequestException('أكد القيمة الشهرية لـ KPI للموظفين المحددين قبل الاعتماد');
    const approvedAt = new Date();
    return this.prisma.$transaction(async (tx) => {
      const selectedIds = slips.map((slip) => slip.id);
      const result = await tx.payrollSlip.updateMany({ where: { id: { in: selectedIds }, periodId, approvedAt: null }, data: { approvedById, approvedAt } });
      if (!result.count) throw new BadRequestException('تم اعتماد مفردات الموظفين المحددين مسبقاً؛ حدّث الصفحة');
      const pendingCount = await tx.payrollSlip.count({ where: { periodId, approvedAt: null } });
      const updatedPeriod = pendingCount === 0
        ? await tx.payrollPeriod.update({ where: { id: periodId, status: 'DRAFT' }, data: { status: 'APPROVED', approvedById, approvedAt } })
        : await tx.payrollPeriod.findUniqueOrThrow({ where: { id: periodId } });
      return { period: updatedPeriod, approvedCount: result.count, pendingCount };
    });
  }

  async listApprovedForPayout() {
    const periods = await this.prisma.payrollPeriod.findMany({
      where: { status: { in: ['DRAFT', 'APPROVED'] } }, orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    const results = [];
    for (const period of periods) {
      const slips = await this.prisma.payrollSlip.findMany({
        where: { periodId: period.id }, orderBy: { user: { name: 'asc' } },
        include: {
          approvedBy: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true, phone: true } },
          profile: { select: { kpiEnabled: true, kpiAmount: true } },
          items: { orderBy: { order: 'asc' } },
          adjustments: { select: { type: true, amount: true, reason: true } },
          payouts: { include: { safe: { select: { name: true } }, createdBy: { select: { name: true } }, transaction: { select: { createdAt: true, targetSafe: { select: { name: true } } } } }, orderBy: { createdAt: 'asc' } },
        },
      });
      const remainingSlips = slips.map((slip) => ({ ...slip, period: { month: period.month, year: period.year, status: period.status }, approvedAt: slip.approvedAt ?? (period.status === 'APPROVED' ? period.approvedAt : null), approvedBy: slip.approvedBy, kpiDefaultAmount: (slip.attendanceDetails as any)?.kpiDefaultAmount ?? slip.profile.kpiAmount, kpiSpecified: (slip.attendanceDetails as any)?.kpiSpecified === true, remainingAmount: roundMoney(Math.max(0, slip.netAmount - slip.paidAmount)) }))
        .filter((slip) => slip.remainingAmount > 0 && (slip.approvedAt || period.status === 'APPROVED'));
      if (remainingSlips.length) results.push({ id: period.id, year: period.year, month: period.month, slips: remainingSlips, totalRemaining: roundMoney(remainingSlips.reduce((sum, slip) => sum + slip.remainingAmount, 0)) });
    }
    return results;
  }

  async payout(slipId: string, safeId: string, targetSafeId: string, amount: number, description: string, createdById: string) {
    if (!Number.isFinite(amount) || amount <= 0 || !safeId || !targetSafeId) throw new BadRequestException('حدد خزينة الدخل وخزينة الوجهة ومبلغ التحويل الصحيح');
    if (safeId === targetSafeId) throw new BadRequestException('يجب أن تكون خزينة الوجهة مختلفة عن خزينة الدخل');
    if (!description?.trim()) throw new BadRequestException('اكتب وصفاً واضحاً لقيد صرف الراتب');
    amount = roundMoney(amount);
    if (amount <= 0) throw new BadRequestException('مبلغ الصرف أقل من الحد الأدنى المسموح');
    return this.prisma.$transaction(async (tx) => {
      const slip = await tx.payrollSlip.findUnique({ where: { id: slipId }, include: { user: { select: { name: true } }, period: true } });
      if (!slip) throw new NotFoundException('مفردات الراتب غير موجودة');
      if (slip.period.status !== 'APPROVED' && !slip.approvedAt) throw new BadRequestException('لا يمكن صرف راتب قبل اعتماد المدير لمفردة الموظف');
      const remaining = roundMoney(slip.netAmount - slip.paidAmount);
      if (amount - remaining > 0.005) throw new BadRequestException(`مبلغ الصرف يتجاوز المتبقي (${remaining} ج.م)`);
      const [safe, targetSafe] = await Promise.all([
        tx.safe.findUnique({ where: { id: safeId } }),
        tx.safe.findUnique({ where: { id: targetSafeId } }),
      ]);
      if (!safe || !safe.isActive) throw new NotFoundException('خزينة الدخل غير موجودة أو غير نشطة');
      if (safe.category !== 'INCOME') throw new BadRequestException('يجب اختيار خزينة مصدر مصنفة كخزينة دخل');
      if (!targetSafe || !targetSafe.isActive) throw new NotFoundException('خزينة الوجهة غير موجودة أو غير نشطة');
      const debit = await tx.safe.updateMany({ where: { id: safeId, isActive: true, category: 'INCOME', balance: { gte: amount } }, data: { balance: { decrement: amount } } });
      if (!debit.count) throw new BadRequestException('رصيد خزينة الدخل غير كافٍ لمبلغ التحويل');
      await tx.safe.update({ where: { id: targetSafeId }, data: { balance: { increment: amount } } });
      const transaction = await tx.transaction.create({
        data: { type: 'TRANSFER', amount: roundMoney(amount), sourceId: safeId, targetId: targetSafeId, description: `تحويل راتب ${slip.user.name} عن ${slip.period.month}/${slip.period.year} — ${description.trim()}`, reference: `PAYROLL_${slip.id}`, createdById },
      });
      const payout = await tx.payrollPayout.create({ data: { slipId, amount: roundMoney(amount), safeId, transactionId: transaction.id, createdById }, include: { safe: { select: { id: true, name: true } }, createdBy: { select: { name: true } } } });
      // Compare-and-update prevents two concurrent cashier requests from paying
      // the same remaining balance twice. A failed guard rolls the safe debit back.
      const slipUpdate = await tx.payrollSlip.updateMany({
        where: { id: slipId, paidAmount: slip.paidAmount, netAmount: slip.netAmount },
        data: { paidAmount: { increment: amount } },
      });
      if (!slipUpdate.count) throw new BadRequestException('تم تحديث مفردات الراتب أثناء الصرف؛ أعد تحميل الصفحة');
      const updatedSlip = await tx.payrollSlip.findUniqueOrThrow({ where: { id: slipId } });
      return { payout, slip: updatedSlip, transaction };
    });
  }

  async getMySlips(userId: string) {
    const profile = await this.prisma.payrollProfile.findUnique({ where: { userId }, select: { isActive: true } });
    if (!profile) return [];
    return this.prisma.payrollSlip.findMany({
      where: { userId, OR: [{ approvedAt: { not: null } }, { period: { status: { in: ['APPROVED', 'CLOSED'] } } }] },
      include: { period: { select: { year: true, month: true, status: true } }, profile: { select: { kpiEnabled: true, kpiAmount: true } }, items: { orderBy: { order: 'asc' } }, adjustments: { select: { type: true, amount: true, reason: true, createdAt: true } }, payouts: { include: { safe: { select: { name: true } }, createdBy: { select: { name: true } }, transaction: { select: { createdAt: true, targetSafe: { select: { name: true } } } } }, orderBy: { createdAt: 'asc' } } },
      orderBy: [{ period: { year: 'desc' } }, { period: { month: 'desc' } }],
    }).then((slips) => slips.map((slip) => ({ ...slip, kpiDefaultAmount: (slip.attendanceDetails as any)?.kpiDefaultAmount ?? slip.profile.kpiAmount, kpiSpecified: (slip.attendanceDetails as any)?.kpiSpecified === true, remainingAmount: roundMoney(Math.max(0, slip.netAmount - slip.paidAmount)), payoutStatus: slip.paidAmount >= slip.netAmount ? 'PAID' : slip.paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING' })));
  }

  async getMyPayrollEligibility(userId: string) {
    const profile = await this.prisma.payrollProfile.findUnique({ where: { userId }, select: { id: true } });
    return { hasPayrollProfile: Boolean(profile) };
  }

  async getMyPayrollProfile(userId: string) {
    const profile = await this.prisma.payrollProfile.findUnique({
      where: { userId },
      include: {
        salaryChanges: { orderBy: { effectiveAt: 'asc' } },
        components: { orderBy: { order: 'asc' }, select: { name: true, percentage: true, attendanceBased: true } },
      },
    });
    if (!profile) return null;

    const latestKpiSlip = profile.kpiEnabled
      ? await this.prisma.payrollSlip.findFirst({
          where: { userId, profileId: profile.id, period: { status: { in: ['DRAFT', 'APPROVED', 'CLOSED'] } } },
          include: { period: { select: { year: true, month: true, status: true } } },
          orderBy: [{ period: { year: 'desc' } }, { period: { month: 'desc' } }],
        })
      : null;

    const todayKey = dateKey(new Date());
    let currentBaseSalary = profile.salaryChanges.length ? profile.salaryChanges[0].oldSalary : profile.baseSalary;
    let currentEffectiveFrom = profile.effectiveFrom;
    for (const change of profile.salaryChanges) {
      if (dateKey(change.effectiveAt) > todayKey) break;
      currentBaseSalary = change.newSalary;
      currentEffectiveFrom = change.effectiveAt;
    }

    return {
      baseSalary: currentBaseSalary,
      effectiveFrom: currentEffectiveFrom,
      isActive: profile.isActive,
      kpiEnabled: profile.kpiEnabled,
      defaultKpiAmount: profile.kpiAmount,
      components: profile.components,
      latestKpi: latestKpiSlip ? {
        amount: latestKpiSlip.kpiAmount,
        defaultAmount: (latestKpiSlip.attendanceDetails as any)?.kpiDefaultAmount ?? profile.kpiAmount,
        specified: latestKpiSlip.kpiAmount > 0 || (latestKpiSlip.attendanceDetails as any)?.kpiSpecified === true,
        period: latestKpiSlip.period,
      } : null,
    };
  }
}
