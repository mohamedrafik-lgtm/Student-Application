import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class SecondRoundFeesService {
  constructor(private prisma: PrismaService) {}

  /**
   * جلب طلاب الدور الثاني مع حالة تطبيق القيود المالية — مجمّعين حسب الفصل
   */
  async getStudentsWithFeeStatus(programId: number, feeId?: number) {
    // جلب الفصول الدراسية للبرنامج
    const classrooms = await this.prisma.classroom.findMany({
      where: { program: { id: programId } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    if (classrooms.length === 0) {
      return [];
    }

    // جلب جميع الدرجات في هذه الفصول
    const allGrades = await this.prisma.traineeGrades.findMany({
      where: {
        classroomId: { in: classrooms.map(c => c.id) },
        trainee: { programId },
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            nationalId: true,
            photoUrl: true,
            program: { select: { id: true, nameAr: true, nameEn: true } },
          },
        },
        trainingContent: {
          select: {
            id: true,
            name: true,
            code: true,
            yearWorkMarks: true,
            practicalMarks: true,
            writtenMarks: true,
            attendanceMarks: true,
            quizzesMarks: true,
            finalExamMarks: true,
          },
        },
      },
    });

    // جلب القيود المطبقة مسبقاً
    const appliedFees = await this.prisma.secondRoundFeeApplication.findMany({
      where: {
        trainee: { programId },
        ...(feeId ? { feeId } : {}),
      },
      select: {
        traineeId: true,
        contentId: true,
        feeId: true,
        amount: true,
        createdAt: true,
        fee: { select: { id: true, name: true } },
        appliedBy: { select: { id: true, name: true } },
      },
    });

    // إنشاء map للقيود المطبقة
    const appliedMap = new Map<string, any[]>();
    appliedFees.forEach(app => {
      const key = `${app.traineeId}-${app.contentId}`;
      if (!appliedMap.has(key)) {
        appliedMap.set(key, []);
      }
      appliedMap.get(key).push(app);
    });

    // تجميع حسب الفصل ثم حسب المتدرب
    const classroomMap = new Map<number, { classroom: any; traineeMap: Map<number, any> }>();
    
    // تهيئة كل الفصول
    classrooms.forEach(c => {
      classroomMap.set(c.id, { classroom: c, traineeMap: new Map() });
    });

    allGrades.forEach(grade => {
      const content = grade.trainingContent;
      const maxMarks =
        (content.yearWorkMarks || 0) +
        (content.practicalMarks || 0) +
        (content.writtenMarks || 0) +
        (content.attendanceMarks || 0) +
        (content.quizzesMarks || 0) +
        (content.finalExamMarks || 0);

      const total =
        (Number(grade.yearWorkMarks) || 0) +
        (Number(grade.practicalMarks) || 0) +
        (Number(grade.writtenMarks) || 0) +
        (Number(grade.attendanceMarks) || 0) +
        (Number(grade.quizzesMarks) || 0) +
        (Number(grade.finalExamMarks) || 0);

      const percentage = maxMarks > 0 ? (total / maxMarks) * 100 : 0;

      // فقط المواد أقل من 50%
      if (percentage < 50) {
        const classroomEntry = classroomMap.get(grade.classroomId);
        if (!classroomEntry) return;

        if (!classroomEntry.traineeMap.has(grade.traineeId)) {
          classroomEntry.traineeMap.set(grade.traineeId, {
            trainee: grade.trainee,
            failedSubjects: [],
          });
        }

        const key = `${grade.traineeId}-${content.id}`;
        const applied = appliedMap.get(key) || [];

        classroomEntry.traineeMap.get(grade.traineeId).failedSubjects.push({
          content: { id: content.id, name: content.name, code: content.code },
          totalMarks: Number(total.toFixed(2)),
          maxMarks,
          percentage: Number(percentage.toFixed(2)),
          appliedFees: applied,
          isApplied: feeId ? applied.some(a => a.feeId === feeId) : applied.length > 0,
        });
      }
    });

    // تحويل إلى مصفوفة النتائج
    const result = [];
    for (const [, entry] of classroomMap) {
      const students = Array.from(entry.traineeMap.values()).sort((a, b) =>
        a.trainee.nameAr.localeCompare(b.trainee.nameAr, 'ar'),
      );
      if (students.length > 0) {
        result.push({
          classroom: entry.classroom,
          students,
          totalStudents: students.length,
        });
      }
    }

    return result;
  }

  /**
   * جلب القيود المالية المتاحة للبرنامج مع إحصائيات التطبيق
   */
  async getAvailableFees(programId: number) {
    const fees = await this.prisma.traineeFee.findMany({
      where: {
        programId,
      },
      include: {
        safe: { select: { id: true, name: true } },
        _count: { select: { secondRoundFeeApplications: true } },
      },
      orderBy: { id: 'asc' },
    });

    // جلب إجمالي المبالغ المطبقة لكل قيد
    const applicationStats = await this.prisma.secondRoundFeeApplication.groupBy({
      by: ['feeId'],
      where: { trainee: { programId } },
      _sum: { amount: true },
      _count: true,
    });

    const statsMap = new Map(
      applicationStats.map(s => [s.feeId, { count: s._count, totalAmount: s._sum.amount || 0 }]),
    );

    return fees.map(fee => ({
      id: fee.id,
      name: fee.name,
      amount: fee.amount,
      type: fee.type,
      academicYear: fee.academicYear,
      allowMultipleApply: fee.allowMultipleApply,
      safeId: fee.safeId,
      safeName: fee.safe?.name,
      appliedCount: statsMap.get(fee.id)?.count || 0,
      appliedTotalAmount: statsMap.get(fee.id)?.totalAmount || 0,
    }));
  }

  /**
   * تطبيق قيد مالي على جميع طلاب الدور الثاني في البرنامج
   */
  async applyFeeToSecondRound(programId: number, feeId: number, userId: string) {
    // التحقق من وجود القيد المالي
    const fee = await this.prisma.traineeFee.findUnique({
      where: { id: feeId },
      include: { safe: true },
    });

    if (!fee) {
      throw new NotFoundException('القيد المالي غير موجود');
    }

    if (fee.programId !== programId) {
      throw new BadRequestException('القيد المالي لا ينتمي لهذا البرنامج');
    }

    // جلب طلاب الدور الثاني مع حالة التطبيق
    const classroomGroups = await this.getStudentsWithFeeStatus(programId, feeId);

    const allStudents = classroomGroups.flatMap(g => g.students);

    if (allStudents.length === 0) {
      throw new BadRequestException('لا يوجد طلاب دور ثاني في هذا البرنامج');
    }

    // تحديد المواد غير المطبق عليها القيد بعد
    const toApply: { traineeId: number; contentId: number; traineeName: string; contentName: string }[] = [];

    allStudents.forEach(student => {
      student.failedSubjects.forEach((subject: any) => {
        if (!subject.isApplied) {
          toApply.push({
            traineeId: student.trainee.id,
            contentId: subject.content.id,
            traineeName: student.trainee.nameAr,
            contentName: subject.content.name,
          });
        }
      });
    });

    if (toApply.length === 0) {
      return {
        success: true,
        message: 'جميع القيود مطبقة بالفعل على جميع الطلاب',
        appliedCount: 0,
        totalAmount: 0,
      };
    }

    // تطبيق القيود في transaction واحدة مع timeout مناسب
    const totalAmount = fee.amount * toApply.length;

    try {
      // تقسيم العمليات إلى دفعات لتجنب timeout
      const BATCH_SIZE = 50;
      for (let i = 0; i < toApply.length; i += BATCH_SIZE) {
        const batch = toApply.slice(i, i + BATCH_SIZE);

        await this.prisma.$transaction(
          async (prisma) => {
            // إنشاء المعاملات المالية دفعة واحدة
            await prisma.transaction.createMany({
              data: batch.map(item => ({
                amount: fee.amount,
                type: TransactionType.FEE,
                description: `قيد دور ثاني - ${fee.name} - مادة ${item.contentName} - المتدرب ${item.traineeName}`,
                sourceId: fee.safeId,
                traineeFeeId: fee.id,
                createdById: userId,
              })),
            });

            // إنشاء سجلات مدفوعات المتدربين دفعة واحدة
            await prisma.traineePayment.createMany({
              data: batch.map(item => ({
                amount: fee.amount,
                feeId: fee.id,
                traineeId: item.traineeId,
                safeId: fee.safeId,
                status: 'PENDING',
                notes: `قيد دور ثاني - مادة ${item.contentName}`,
              })),
            });

            // تسجيل التطبيقات دفعة واحدة
            await prisma.secondRoundFeeApplication.createMany({
              data: batch.map(item => ({
                traineeId: item.traineeId,
                contentId: item.contentId,
                feeId: fee.id,
                amount: fee.amount,
                appliedById: userId,
              })),
            });

            // تحديث رصيد الخزينة مرة واحدة للدفعة
            await prisma.safe.update({
              where: { id: fee.safeId },
              data: {
                balance: { decrement: fee.amount * batch.length },
              },
            });
          },
          { timeout: 30000 },
        );
      }

      return {
        success: true,
        message: `تم تطبيق القيد "${fee.name}" على ${toApply.length} مادة بنجاح`,
        appliedCount: toApply.length,
        totalAmount,
        feeName: fee.name,
        feeAmount: fee.amount,
      };
    } catch (error) {
      console.error('❌ خطأ في تطبيق قيود الدور الثاني:', error);
      if (error.code === 'P2002') {
        throw new BadRequestException('بعض القيود مطبقة بالفعل. يرجى تحديث الصفحة والمحاولة مجدداً.');
      }
      throw new BadRequestException(`فشل في تطبيق القيود: ${error.message}`);
    }
  }

  /**
   * جلب ملخص القيود المطبقة لبرنامج معين
   */
  async getApplicationsSummary(programId: number) {
    const applications = await this.prisma.secondRoundFeeApplication.findMany({
      where: {
        trainee: { programId },
      },
      include: {
        trainee: { select: { id: true, nameAr: true } },
        fee: { select: { id: true, name: true, amount: true } },
        appliedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalAmount = applications.reduce((sum, app) => sum + app.amount, 0);

    return {
      applications,
      totalApplications: applications.length,
      totalAmount,
    };
  }
}
