import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import moment from 'moment-timezone';
import { NonPaymentAction } from '@prisma/client';
import { TraineePaymentStatusService } from '../trainee-platform/trainee-payment-status.service';

@Injectable()
export class QuizzesService {
  constructor(
    private prisma: PrismaService,
    private paymentStatusService: TraineePaymentStatusService,
  ) {}

  private async assertPaymentScheduleAllowsQuizzes(traineeId: number) {
    const paymentStatus = await this.paymentStatusService.checkTraineePaymentStatus(traineeId);
    if (paymentStatus.canAccessQuizzes) return paymentStatus;

    const blockedFees = (paymentStatus.overduePayments || [])
      .filter(payment => payment.actions?.includes(NonPaymentAction.DISABLE_QUIZZES) || payment.actions?.includes(NonPaymentAction.DISABLE_ALL))
      .map(payment => payment.feeName);
    const reason = blockedFees.length
      ? `تم إيقاف الاختبارات الإلكترونية بسبب عدم سداد: ${[...new Set(blockedFees)].join('، ')}`
      : paymentStatus.message || 'تم إيقاف الاختبارات الإلكترونية مؤقتاً';
    throw new ForbiddenException(reason);
  }

  private summarizeFeePayments(payments: Array<{
    amount: number;
    feeAmount: number;
    paidAmount: number;
    feePaidAmount: number;
    status: string;
  }>, fallbackFeeAmount = 0) {
    const activePayments = payments.filter(payment => payment.status !== 'CANCELLED');
    const totalDue = activePayments.reduce((sum, payment) => {
      return sum + Number(payment.feeAmount || payment.amount || fallbackFeeAmount || 0);
    }, 0);
    const totalPaid = activePayments.reduce((sum, payment) => {
      const principal = Number(payment.feeAmount || payment.amount || fallbackFeeAmount || 0);
      // Older payment rows did not populate feeAmount/feePaidAmount. PAID is
      // authoritative for fully settled rows; otherwise use the populated pair.
      const paidPrincipal = payment.status === 'PAID'
        ? principal
        : payment.feeAmount > 0
          ? Number(payment.feePaidAmount || 0)
          : Number(payment.paidAmount || 0);
      return sum + Math.min(principal, paidPrincipal);
    }, 0);

    return {
      totalDue,
      totalPaid,
      isFullyPaid: activePayments.length > 0 && (
        activePayments.every(payment => payment.status === 'PAID') ||
        (totalDue > 0 && totalPaid + 0.005 >= totalDue)
      ),
    };
  }

  private async getMobileAppSettings() {
    const settings = await this.prisma.developerSettings.findMany({
      where: {
        key: { in: ['MOBILE_APP_ENABLED', 'MOBILE_APP_GOOGLE_PLAY_URL', 'MOBILE_APP_APPSTORE_URL'] },
        isActive: true,
      },
      select: { key: true, value: true },
    });
    const values = new Map(settings.map(setting => [setting.key, setting.value || '']));
    return {
      enabled: values.get('MOBILE_APP_ENABLED') === 'true',
      googlePlayUrl: values.get('MOBILE_APP_GOOGLE_PLAY_URL') || '',
      appStoreUrl: values.get('MOBILE_APP_APPSTORE_URL') || '',
    };
  }

  private async validateDeliveryPlatform(platform?: string) {
    const normalizedPlatform = platform || 'WEB';
    if (!['WEB', 'MOBILE', 'BOTH'].includes(normalizedPlatform)) {
      throw new BadRequestException('منصة إتاحة الاختبار غير صحيحة');
    }
    if (normalizedPlatform !== 'WEB') {
      const mobileApp = await this.getMobileAppSettings();
      if (!mobileApp.enabled) {
        throw new BadRequestException('يجب تفعيل تطبيق الهاتف من إعدادات تطبيق الجوال قبل إتاحة الاختبار عليه');
      }
    }
    return normalizedPlatform;
  }

  private assertAttemptPlatform(quizPlatform: string, requestedPlatform?: string) {
    const platform = requestedPlatform || 'WEB';
    if (quizPlatform === 'MOBILE' && platform !== 'MOBILE') {
      throw new ForbiddenException('هذا الاختبار متاح عبر تطبيق الهاتف فقط');
    }
    if (quizPlatform === 'WEB' && platform !== 'WEB') {
      throw new ForbiddenException('هذا الاختبار متاح عبر منصة الويب فقط');
    }
  }

  private assertApprovedAttemptWindow(attempt: any) {
    if (!attempt.integrityAllowedStartAt && !attempt.integrityAllowedEndAt) return;
    const now = new Date();
    if (attempt.integrityAllowedStartAt && now < attempt.integrityAllowedStartAt) {
      throw new ForbiddenException('لم يبدأ موعد الاستكمال المحدد بعد');
    }
    if (attempt.integrityAllowedEndAt && now > attempt.integrityAllowedEndAt) {
      throw new ForbiddenException('انتهى موعد الاستكمال المحدد؛ راجع الإدارة');
    }
  }

  private async parseQuizDateTime(value: string): Promise<Date> {
    // datetime-local carries no offset: interpret it in the center's configured timezone,
    // not the backend host timezone (which may differ from Africa/Cairo).
    if (/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
      const explicitDate = new Date(value);
      if (Number.isNaN(explicitDate.getTime())) throw new BadRequestException('صيغة وقت الاختبار غير صحيحة');
      return explicitDate;
    }

    const settings = await this.prisma.systemSettings.findFirst({ select: { timezone: true } });
    const configuredTimezone = settings?.timezone || 'Africa/Cairo';
    const timezone = moment.tz.zone(configuredTimezone) ? configuredTimezone : 'Africa/Cairo';
    const parsed = moment.tz(value, timezone);
    if (!parsed.isValid()) throw new BadRequestException('صيغة وقت الاختبار غير صحيحة');
    return parsed.toDate();
  }

  private async assertRequiredFeePaid(quiz: any, traineeId: number) {
    if (!quiz.feeRequirementEnabled) return;

    const trainee = await this.prisma.trainee.findUnique({ where: { id: traineeId }, select: { programId: true } });
    const fee = quiz.requiredFee || (quiz.requiredFeeId
      ? await this.prisma.traineeFee.findUnique({ where: { id: quiz.requiredFeeId }, select: { id: true, name: true, amount: true, programId: true } })
      : null);

    if (!trainee || !fee || fee.programId !== trainee.programId || fee.programId !== quiz.trainingContent?.programId) {
      throw new ForbiddenException('تعذر التحقق من الرسم المرتبط بهذا الاختبار');
    }

    const payments = await this.prisma.traineePayment.findMany({
      where: { traineeId, feeId: fee.id },
      select: { amount: true, feeAmount: true, paidAmount: true, feePaidAmount: true, status: true },
    });
    const paymentSummary = this.summarizeFeePayments(payments, Number(fee.amount || 0));
    const totalDue = paymentSummary.totalDue || Number(fee.amount || 0);
    const isFullyPaid = paymentSummary.isFullyPaid;

    if (!isFullyPaid) {
      const exceptions = await this.prisma.traineePaymentException.findMany({
        where: { traineeId, OR: [{ feeId: fee.id }, { feeId: null }] },
        orderBy: { createdAt: 'desc' },
        select: { feeId: true, customPaymentEndDate: true, customGracePeriodDays: true, customFinalDeadline: true },
      });
      if (this.resolveActivePaymentException(exceptions, fee.id)) return;
      const remaining = Math.max(0, totalDue - paymentSummary.totalPaid);
      throw new ForbiddenException(`لا يمكنك أداء الاختبار قبل سداد رسم "${fee.name}" بالكامل. المبلغ المتبقي: ${remaining.toFixed(2)}`);
    }
  }

  private resolveActivePaymentException(exceptions: any[], feeId: number, now = new Date()) {
    const specificException = exceptions.find((exception) => exception.feeId === feeId);
    const generalException = exceptions.find((exception) => exception.feeId === null);
    const exception = specificException || generalException;
    if (!exception) return null;

    let deadline = exception.customFinalDeadline ? new Date(exception.customFinalDeadline) : null;
    if (!deadline && exception.customPaymentEndDate) {
      deadline = new Date(exception.customPaymentEndDate);
      deadline.setUTCHours(23, 59, 59, 999);
      deadline.setUTCDate(deadline.getUTCDate() + Number(exception.customGracePeriodDays || 0));
    }
    if (deadline && deadline.getUTCHours() === 0 && deadline.getUTCMinutes() === 0 && deadline.getUTCSeconds() === 0 && deadline.getUTCMilliseconds() === 0) {
      deadline.setUTCHours(23, 59, 59, 999);
    }
    if (!deadline || Number.isNaN(deadline.getTime()) || now.getTime() > deadline.getTime()) return null;
    return { deadline, exceptionId: exception.id };
  }

  private readonly gradeComponentLabels: Record<string, string> = {
    yearWorkMarks: 'أعمال السنة', practicalMarks: 'العملي', writtenMarks: 'التحريري',
    attendanceMarks: 'الحضور', quizzesMarks: 'اختبارات أونلاين', finalExamMarks: 'الميد تيرم',
  };

  private async validateGradeAllocation(contentId: number, componentKey: string, allocation: number, excludeQuizId?: number) {
    const content = await this.prisma.trainingContent.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException('المحتوى التدريبي غير موجود');
    const cap = Number((content as any)[componentKey] || 0);
    const current = await this.prisma.quiz.aggregate({
      where: { trainingContentId: contentId, gradeComponentKey: componentKey, ...(excludeQuizId ? { id: { not: excludeQuizId } } : {}) },
      _sum: { gradeAllocation: true },
    });
    const alreadyAllocated = Number(current._sum.gradeAllocation || 0);
    if (allocation <= 0 || alreadyAllocated + allocation > cap + 0.0001) {
      throw new BadRequestException(`الدرجات المتاحة في ${(content as any)[`${componentKey}Label`] || this.gradeComponentLabels[componentKey]} هي ${Math.max(0, cap - alreadyAllocated)} من ${cap}`);
    }
    // احجز مساحة الاختبارات من الدرجة اليدوية حتى لا يتجاوز مجموع الجزء حده الأعلى.
    // quizzesMarks مستثنى للحفاظ على سجلات التوزيع القديمة التي كانت تُدار آلياً.
    if (componentKey !== 'quizzesMarks') {
      const [grades, contributions] = await Promise.all([
        this.prisma.traineeGrades.findMany({ where: { trainingContentId: contentId }, select: { traineeId: true, [componentKey]: true } as any }),
        this.prisma.quizGradeContribution.groupBy({
          by: ['traineeId'], where: { trainingContentId: contentId, componentKey },
          _sum: { earnedMarks: true },
        }),
      ]);
      const earnedByTrainee = new Map(contributions.map(row => [row.traineeId, Number(row._sum.earnedMarks || 0)]));
      for (const grade of grades as any[]) {
        const manualMarks = Math.max(0, Number(grade[componentKey] || 0) - (earnedByTrainee.get(grade.traineeId) || 0));
        if (manualMarks + alreadyAllocated + allocation > cap + 0.0001) {
          throw new BadRequestException(`لا يمكن تخصيص الدرجة: الدرجة اليدوية المسجلة في هذا الجزء لا تترك مساحة كافية. المتاح للاختبارات ${Math.max(0, cap - manualMarks - alreadyAllocated)} درجة.`);
        }
      }
    }
    return { label: (content as any)[`${componentKey}Label`] || this.gradeComponentLabels[componentKey] || componentKey };
  }

  /**
   * إنشاء اختبار جديد
   */
  async create(createQuizDto: CreateQuizDto, changedById?: string) {
    const { questions, ...quizData } = createQuizDto;

    // التحقق من وجود المحتوى التدريبي
    const content = await this.prisma.trainingContent.findUnique({
      where: { id: quizData.trainingContentId },
    });

    if (!content) {
      throw new NotFoundException('المحتوى التدريبي غير موجود');
    }

    const feeRequirementEnabled = createQuizDto.feeRequirementEnabled ?? false;
    const deliveryPlatform = await this.validateDeliveryPlatform(createQuizDto.deliveryPlatform);
    const integrityMonitoringEnabled = createQuizDto.integrityMonitoringEnabled ?? false;
    const maxTabDepartures = createQuizDto.maxTabDepartures ?? 3;
    if (!Number.isInteger(maxTabDepartures) || maxTabDepartures < 0 || maxTabDepartures > 100) {
      throw new BadRequestException('عدد المغادرات المسموح يجب أن يكون من 0 إلى 100');
    }
    const requiredFeeId = createQuizDto.requiredFeeId ?? null;
    if (feeRequirementEnabled && !requiredFeeId) {
      throw new BadRequestException('اختر الرسم المطلوب سداده أو أوقف شرط السداد');
    }
    if (requiredFeeId) {
      const requiredFee = await this.prisma.traineeFee.findUnique({ where: { id: requiredFeeId }, select: { id: true, programId: true } });
      if (!requiredFee || requiredFee.programId !== content.programId) {
        throw new BadRequestException('يجب اختيار رسم تابع للبرنامج التدريبي المحدد');
      }
    }

    const component = await this.validateGradeAllocation(
      quizData.trainingContentId,
      quizData.gradeComponentKey,
      quizData.gradeAllocation,
    );

    // التحقق من صحة التواريخ
    const [startDate, endDate] = await Promise.all([
      this.parseQuizDateTime(quizData.startDate),
      this.parseQuizDateTime(quizData.endDate),
    ]);

    if (startDate >= endDate) {
      throw new BadRequestException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
    }

    // إنشاء الاختبار مع الأسئلة
    const quiz = await this.prisma.quiz.create({
      data: {
        ...quizData,
        feeRequirementEnabled,
        requiredFeeId,
        deliveryPlatform,
        integrityMonitoringEnabled,
        maxTabDepartures,
        gradeComponentLabel: component.label,
        startDate,
        endDate,
        questions: {
          create: questions.map((q, index) => ({
            questionId: q.questionId,
            order: q.order ?? index,
            points: q.points ?? 1,
          })),
        },
      } as any,
      include: {
        trainingContent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        questions: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    await this.prisma.quizGradeAllocationLog.create({
      data: {
        quizId: quiz.id,
        newComponentKey: quizData.gradeComponentKey,
        newComponentLabel: component.label,
        newAllocation: quizData.gradeAllocation,
        changedById,
      },
    });

    // ✅ إذا أُنشئ الاختبار منشوراً ونشطاً → إعادة حساب درجات كل المتدربين (يتغير المقام)
    if (quiz.isPublished && quiz.isActive) {
      this.recalculateAllQuizGradesForContent((quiz as any).trainingContent.id).catch(err => {
        console.error('❌ [Quiz Create] خطأ في إعادة حساب الدرجات:', err);
      });
    }

    return quiz;
  }

  /**
   * الحصول على جميع الاختبارات
   */
  async findAll(contentId?: number, instructorId?: string) {
    const where: any = {};

    if (contentId) {
      where.trainingContentId = contentId;
    }

    // إذا تم تحديد instructorId، نجلب الاختبارات لمواده فقط
    if (instructorId) {
      where.trainingContent = {
        instructorId: instructorId,
      };
    }

    return this.prisma.quiz.findMany({
      where,
      include: {
        trainingContent: {
          select: {
            id: true,
            name: true,
            code: true,
            programId: true,
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
            program: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
              },
            },
          },
        },
        requiredFee: { select: { id: true, name: true, amount: true, programId: true } },
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * الحصول على اختبار معين
   */
  async findOne(id: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        trainingContent: {
          select: {
            id: true,
            name: true,
            code: true,
            programId: true,
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        questions: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        requiredFee: { select: { id: true, name: true, amount: true, programId: true } },
        _count: {
          select: {
            attempts: true,
          },
        },
        gradeAllocationLogs: { orderBy: { changedAt: 'desc' } },
      },
    });

    if (!quiz) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    return quiz;
  }

  /**
   * الحصول على تفاصيل محاولة
   */
  async getAttemptDetails(attemptId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
          },
        },
        quiz: {
          include: {
            trainingContent: {
              select: {
                name: true,
                code: true,
              },
            },
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        answers: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
        integrityEvents: { orderBy: { occurredAt: 'asc' } },
      },
    });

    if (!attempt) {
      throw new NotFoundException('المحاولة غير موجودة');
    }

    // تحويل الإجابات لإضافة selectedOptionId
    const answersWithOptionId = attempt.answers.map(answer => ({
      ...answer,
      selectedOptionId: answer.selectedAnswer ? parseInt(answer.selectedAnswer) : null,
      earnedPoints: answer.points || 0,
    }));

    return {
      id: attempt.id,
      trainee: attempt.trainee,
      quiz: {
        id: attempt.quiz.id,
        title: attempt.quiz.title,
        showCorrectAnswers: attempt.quiz.showCorrectAnswers,
        trainingContent: attempt.quiz.trainingContent,
      },
      status: attempt.status,
      score: attempt.score,
      percentage: attempt.percentage,
      passed: attempt.passed,
      tabDepartureCount: (attempt as any).tabDepartureCount || 0,
      integrityBlockedAt: (attempt as any).integrityBlockedAt,
      integrityBlockReason: (attempt as any).integrityBlockReason,
      integrityEvents: (attempt as any).integrityEvents || [],
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      questions: attempt.quiz.questions,
      answers: answersWithOptionId,
    };
  }

  /**
   * الحصول على تقرير الاختبار
   */
  async getQuizReport(quizId: number) {
    // جلب معلومات الاختبار
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        trainingContent: {
          include: {
            classroom: true,
            program: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    // جميع المحاولات، بما فيها الموقوفة، مع سجل المغادرات للمراجعة.
    const db = this.prisma as any;
    const attempts = await db.quizAttempt.findMany({
      where: { quizId },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
          },
        },
        integrityEvents: { orderBy: { occurredAt: 'asc' } },
      },
      orderBy: [{ integrityBlockedAt: 'desc' }, { percentage: 'desc' }],
    });

    const accessRequests = await db.quizAccessRequest.findMany({
      where: { quizId },
      include: {
        trainee: { select: { id: true, nameAr: true, nationalId: true, phone: true } },
        attempt: { include: { integrityEvents: { orderBy: { occurredAt: 'asc' } } } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    // جلب جميع المتدربين في نفس الفصل الدراسي (من خلال جدول الدرجات)
    const traineesInClassroom = await this.prisma.traineeGrades.findMany({
      where: {
        classroomId: quiz.trainingContent.classroomId,
      },
      select: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
          },
        },
      },
      distinct: ['traineeId'],
    });

    const allTrainees = traineesInClassroom.map(tg => tg.trainee);

    // المتدربون الذين لم يختبروا
    const traineeIdsWhoTook = attempts.map(a => a.traineeId);
    const traineesWhoDidNotTakeQuiz = allTrainees.filter(
      t => !traineeIdsWhoTook.includes(t.id)
    );

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        trainingContent: {
          name: quiz.trainingContent.name,
          code: quiz.trainingContent.code,
          classroom: {
            name: quiz.trainingContent.classroom.name,
          },
        },
        duration: quiz.duration,
        passingScore: quiz.passingScore,
      },
      attempts,
      accessRequests,
      traineesWhoDidNotTakeQuiz,
    };
  }

  /**
   * تحديث اختبار
   */
  async update(id: number, updateQuizDto: UpdateQuizDto, changedById?: string) {
    const { questions, ...quizData } = updateQuizDto;

    // التحقق من وجود الاختبار
    const existingQuiz = await this.prisma.quiz.findUnique({
      where: { id },
    });

    if (!existingQuiz) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    const targetContentId = updateQuizDto.trainingContentId ?? existingQuiz.trainingContentId;
    const feeRequirementEnabled = updateQuizDto.feeRequirementEnabled ?? existingQuiz.feeRequirementEnabled;
    const existingDeliveryPlatform = (existingQuiz as any).deliveryPlatform || 'WEB';
    const requestedDeliveryPlatform = updateQuizDto.deliveryPlatform ?? existingDeliveryPlatform;
    const deliveryPlatform = requestedDeliveryPlatform === existingDeliveryPlatform
      ? existingDeliveryPlatform
      : await this.validateDeliveryPlatform(requestedDeliveryPlatform);
    const integrityMonitoringEnabled = updateQuizDto.integrityMonitoringEnabled ?? (existingQuiz as any).integrityMonitoringEnabled ?? false;
    const maxTabDepartures = updateQuizDto.maxTabDepartures ?? (existingQuiz as any).maxTabDepartures ?? 3;
    if (!Number.isInteger(maxTabDepartures) || maxTabDepartures < 0 || maxTabDepartures > 100) {
      throw new BadRequestException('عدد المغادرات المسموح يجب أن يكون من 0 إلى 100');
    }
    const requiredFeeId = updateQuizDto.requiredFeeId !== undefined ? updateQuizDto.requiredFeeId : existingQuiz.requiredFeeId;
    if (feeRequirementEnabled && !requiredFeeId) {
      throw new BadRequestException('اختر الرسم المطلوب سداده أو أوقف شرط السداد');
    }
    if (requiredFeeId) {
      const [targetContent, requiredFee] = await Promise.all([
        this.prisma.trainingContent.findUnique({ where: { id: targetContentId }, select: { programId: true } }),
        this.prisma.traineeFee.findUnique({ where: { id: requiredFeeId }, select: { id: true, programId: true } }),
      ]);
      if (!targetContent || !requiredFee || requiredFee.programId !== targetContent.programId) {
        throw new BadRequestException('يجب اختيار رسم تابع للبرنامج التدريبي المحدد');
      }
    }
    (quizData as any).feeRequirementEnabled = feeRequirementEnabled;
    (quizData as any).requiredFeeId = requiredFeeId;
    (quizData as any).deliveryPlatform = deliveryPlatform;
    (quizData as any).integrityMonitoringEnabled = integrityMonitoringEnabled;
    (quizData as any).maxTabDepartures = maxTabDepartures;

    const allocationProvided = updateQuizDto.gradeComponentKey !== undefined || updateQuizDto.gradeAllocation !== undefined;
    const allocationChanged = allocationProvided && (
      (updateQuizDto.gradeComponentKey !== undefined && updateQuizDto.gradeComponentKey !== existingQuiz.gradeComponentKey) ||
      (updateQuizDto.gradeAllocation !== undefined && updateQuizDto.gradeAllocation !== existingQuiz.gradeAllocation)
    );
    let newAllocationLabel = existingQuiz.gradeComponentLabel || this.gradeComponentLabels[existingQuiz.gradeComponentKey || 'quizzesMarks'];
    if (allocationChanged) {
      const nextKey = updateQuizDto.gradeComponentKey || existingQuiz.gradeComponentKey || 'quizzesMarks';
      const nextAllocation = updateQuizDto.gradeAllocation !== undefined ? updateQuizDto.gradeAllocation : existingQuiz.gradeAllocation;
      if (nextAllocation != null) {
        const component = await this.validateGradeAllocation(existingQuiz.trainingContentId, nextKey, nextAllocation, id);
        newAllocationLabel = component.label;
      } else {
        const content = await this.prisma.trainingContent.findUnique({ where: { id: existingQuiz.trainingContentId } });
        newAllocationLabel = content ? (content as any)[`${nextKey}Label`] || this.gradeComponentLabels[nextKey] || nextKey : nextKey;
      }
      (quizData as any).gradeComponentKey = nextKey;
      (quizData as any).gradeAllocation = nextAllocation;
      (quizData as any).gradeComponentLabel = newAllocationLabel;
    }

    // التحقق من صحة التواريخ إذا تم تحديثها
    if (quizData.startDate || quizData.endDate) {
      const startDate = quizData.startDate
        ? await this.parseQuizDateTime(quizData.startDate)
        : existingQuiz.startDate;
      const endDate = quizData.endDate
        ? await this.parseQuizDateTime(quizData.endDate)
        : existingQuiz.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      }
    }

    // تحديث الاختبار
    const updateData: any = {
      ...quizData,
    };

    if (quizData.startDate) {
      updateData.startDate = await this.parseQuizDateTime(quizData.startDate);
    }

    if (quizData.endDate) {
      updateData.endDate = await this.parseQuizDateTime(quizData.endDate);
    }

    // إذا تم تحديث الأسئلة
    if (questions) {
      // حذف الأسئلة القديمة
      await this.prisma.quizQuestion.deleteMany({
        where: { quizId: id },
      });

      // إضافة الأسئلة الجديدة
      updateData.questions = {
        create: questions.map((q, index) => ({
          questionId: q.questionId,
          order: q.order ?? index,
          points: q.points ?? 1,
        })),
      };
    }

    const quiz = await this.prisma.quiz.update({
      where: { id },
      data: updateData,
      include: {
        trainingContent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        questions: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (allocationChanged) {
      await this.prisma.quizGradeAllocationLog.create({
        data: {
          quizId: id,
          oldComponentKey: existingQuiz.gradeComponentKey,
          oldComponentLabel: existingQuiz.gradeComponentLabel,
          oldAllocation: existingQuiz.gradeAllocation,
          newComponentKey: quiz.gradeComponentKey || 'quizzesMarks',
          newComponentLabel: newAllocationLabel,
          newAllocation: quiz.gradeAllocation || 0,
          changedById,
        },
      });
    }

    // ✅ إذا تغيرت حالة النشر أو التفعيل → إعادة حساب درجات كل المتدربين
    const publishChanged = quizData.isPublished !== undefined && quizData.isPublished !== existingQuiz.isPublished;
    const activeChanged = quizData.isActive !== undefined && quizData.isActive !== existingQuiz.isActive;
    
    if (publishChanged || activeChanged || allocationChanged) {
      console.log(`📊 [Quiz] تغيرت حالة الاختبار ${id} (publish=${publishChanged}, active=${activeChanged}) → إعادة حساب درجات كل المتدربين`);
      // تشغيل في الخلفية بدون انتظار حتى لا يتأخر الرد
      this.recalculateAllQuizGradesForContent(existingQuiz.trainingContentId).catch(err => {
        console.error('❌ [Quiz] خطأ في إعادة حساب الدرجات:', err);
      });
    }

    return quiz;
  }

  /**
   * حذف اختبار
   */
  async remove(id: number) {
    // التحقق من وجود الاختبار
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    // منع الحذف إذا كان هناك محاولات
    if (quiz._count.attempts > 0) {
      throw new BadRequestException(
        'لا يمكن حذف الاختبار لأن هناك محاولات مسجلة عليه',
      );
    }

    // حفظ معلومات الاختبار قبل الحذف لإعادة الحساب
    const wasPublishedAndActive = quiz.isPublished && quiz.isActive;
    const contentId = quiz.trainingContentId;

    await this.prisma.quiz.delete({
      where: { id },
    });

    // ✅ إذا كان الاختبار المحذوف منشوراً ونشطاً → إعادة حساب الدرجات (يتغير المقام)
    if (wasPublishedAndActive) {
      this.recalculateAllQuizGradesForContent(contentId).catch(err => {
        console.error('❌ [Quiz Delete] خطأ في إعادة حساب الدرجات:', err);
      });
    }

    return { message: 'تم حذف الاختبار بنجاح' };
  }

  /**
   * بدء محاولة اختبار (للمتدرب)
   */
  async startQuiz(traineeId: number, startQuizDto: StartQuizDto, ipAddress?: string, userAgent?: string) {
    const { quizId } = startQuizDto;
    console.log(`🎯 Starting quiz ${quizId} for trainee ${traineeId}`);
    await this.assertPaymentScheduleAllowsQuizzes(traineeId);

    // الحصول على الاختبار
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        requiredFee: { select: { id: true, name: true, amount: true, programId: true } },
        trainingContent: { select: { programId: true } },
        questions: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      console.log(`❌ Quiz ${quizId} not found`);
      throw new NotFoundException('الاختبار غير موجود');
    }

    const requestedPlatform = startQuizDto.platform || 'WEB';
    if (requestedPlatform === 'MOBILE') {
      const mobileAppSettings = await this.getMobileAppSettings();
      if (!mobileAppSettings.enabled) {
        throw new ForbiddenException('تطبيق الهاتف غير مفعل حالياً');
      }
    }
    if ((quiz as any).deliveryPlatform === 'MOBILE' && requestedPlatform !== 'MOBILE') {
      throw new ForbiddenException('هذا الاختبار متاح عبر تطبيق الهاتف فقط. حمّل التطبيق للمتابعة.');
    }
    if ((quiz as any).deliveryPlatform === 'WEB' && requestedPlatform === 'MOBILE') {
      throw new ForbiddenException('هذا الاختبار متاح عبر منصة الويب فقط');
    }

    console.log(`✅ Quiz found: ${quiz.title}, Questions: ${quiz.questions?.length || 0}`);

    // التحقق من وجود أسئلة في الاختبار
    if (!quiz.questions || quiz.questions.length === 0) {
      console.log(`❌ Quiz ${quizId} has no questions`);
      throw new BadRequestException('الاختبار لا يحتوي على أسئلة');
    }

    // التحقق من أن الاختبار منشور ونشط
    if (!quiz.isPublished || !quiz.isActive) {
      throw new ForbiddenException('الاختبار غير متاح حالياً');
    }

    await this.assertRequiredFeePaid(quiz, traineeId);

    // هل توجد محاولة مفتوحة حالياً؟
    let currentAttempt = await this.prisma.quizAttempt.findFirst({
      where: { quizId, traineeId, status: 'IN_PROGRESS' },
    });

    if ((currentAttempt as any)?.integrityBlockedAt) {
      throw new ForbiddenException('تم إيقاف المحاولة لتجاوز عدد مغادرات صفحة الاختبار. يمكنك تقديم طلب مراجعة من صفحة الاختبارات.');
    }

    // التحقق من التوقيت
    const now = new Date();
    const allowedStartAt = (currentAttempt as any)?.integrityAllowedStartAt;
    const allowedEndAt = (currentAttempt as any)?.integrityAllowedEndAt;
    const effectiveStartAt = allowedStartAt || quiz.startDate;
    const effectiveEndAt = allowedEndAt || quiz.endDate;
    if (now < effectiveStartAt) {
      throw new ForbiddenException('الاختبار لم يبدأ بعد');
    }

    if (now > effectiveEndAt) {
      throw new ForbiddenException('انتهى موعد الاختبار');
    }

    // التحقق: هل أنهى الاختبار من قبل؟
    const submittedAttempt = await this.prisma.quizAttempt.findFirst({
      where: {
        quizId,
        traineeId,
        status: 'SUBMITTED',
      },
    });

    if (submittedAttempt) {
      console.log(`❌ Quiz already completed`);
      throw new ForbiddenException('لقد أنهيت هذا الاختبار بالفعل');
    }

    // إذا لا يوجد، ننشئ واحد جديد
    if (!currentAttempt) {
      const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
      
      try {
        currentAttempt = await this.prisma.quizAttempt.create({
          data: {
            quizId,
            traineeId,
            attemptNumber: 1, // دائماً 1 لأن المحاولات ملغية
            totalPoints,
            status: 'IN_PROGRESS',
            ipAddress,
            userAgent,
          },
        });
        console.log(`✅ Created new quiz session: ${currentAttempt.id}`);
      } catch (error) {
        // في حالة race condition (طلبان في نفس الوقت)، نجيب الـ attempt اللي اتعمل
        if (error.code === 'P2002') {
          console.log(`⚠️ Race condition detected, fetching existing attempt`);
          currentAttempt = await this.prisma.quizAttempt.findFirst({
            where: {
              quizId,
              traineeId,
              status: 'IN_PROGRESS',
            },
          });
          
          if (!currentAttempt) {
            // لو لسه مش لاقيه، في مشكلة تانية
            throw error;
          }
          console.log(`✅ Retrieved existing quiz session: ${currentAttempt.id}`);
        } else {
          throw error;
        }
      }
    } else {
      console.log(`✅ Resuming existing quiz session: ${currentAttempt.id}`);
    }

    return this.getAttemptWithQuestions(currentAttempt.id);
  }

  async recordTabDeparture(traineeId: number, attemptId: string, dto: { platform: 'WEB' | 'MOBILE'; clientEventId: string; details?: string }) {
    const db = this.prisma as any;
    const attempt = await db.quizAttempt.findUnique({ where: { id: attemptId }, include: { quiz: true } });
    if (!attempt || attempt.traineeId !== traineeId) throw new NotFoundException('المحاولة غير موجودة');
    if (attempt.status !== 'IN_PROGRESS') throw new ForbiddenException('المحاولة لم تعد نشطة');
    this.assertAttemptPlatform(attempt.quiz.deliveryPlatform || 'WEB', dto.platform);
    if (!attempt.quiz.integrityMonitoringEnabled) throw new BadRequestException('مراقبة مغادرات الصفحة غير مفعلة لهذا الاختبار');
    if (attempt.integrityBlockedAt) throw new ForbiddenException('تم إيقاف المحاولة لتجاوز حد المغادرات');

    const existingEvent = await db.quizAttemptEvent.findUnique({ where: { clientEventId: dto.clientEventId } });
    if (existingEvent) return { departureCount: attempt.tabDepartureCount, maxDepartures: attempt.quiz.maxTabDepartures, blocked: !!attempt.integrityBlockedAt };

    try {
      return await db.$transaction(async (tx) => {
        await tx.quizAttemptEvent.create({
          data: {
            attemptId,
            platform: dto.platform,
            clientEventId: dto.clientEventId,
            details: dto.details?.slice(0, 500) || null,
          },
        });
        const updated = await tx.quizAttempt.update({
          where: { id: attemptId },
          data: { tabDepartureCount: { increment: 1 } },
          select: { tabDepartureCount: true },
        });
        const blocked = updated.tabDepartureCount > attempt.quiz.maxTabDepartures;
        if (blocked) {
          await tx.quizAttempt.update({
            where: { id: attemptId },
            data: {
              integrityBlockedAt: new Date(),
              integrityBlockReason: `تجاوز الحد المسموح للمغادرات (${attempt.quiz.maxTabDepartures})؛ العدد المسجل ${updated.tabDepartureCount}`,
            },
          });
        }
        return { departureCount: updated.tabDepartureCount, maxDepartures: attempt.quiz.maxTabDepartures, blocked };
      });
    } catch (error) {
      if (error?.code === 'P2002') return { departureCount: attempt.tabDepartureCount, maxDepartures: attempt.quiz.maxTabDepartures, blocked: !!attempt.integrityBlockedAt };
      throw error;
    }
  }

  async createQuizAccessRequest(traineeId: number, dto: { quizId: number; requestType: 'INTEGRITY_REVIEW' | 'MISSED_EXAM'; reason: string }) {
    const db = this.prisma as any;
    const quiz = await db.quiz.findUnique({ where: { id: dto.quizId }, include: { trainingContent: { select: { programId: true } } } });
    const trainee = await this.prisma.trainee.findUnique({ where: { id: traineeId }, select: { programId: true } });
    if (!quiz || !trainee || quiz.trainingContent.programId !== trainee.programId) throw new NotFoundException('الاختبار غير موجود');
    if (!dto.reason || dto.reason.trim().length < 10) throw new BadRequestException('اكتب تفاصيل الطلب بوضوح (10 أحرف على الأقل)');

    let attemptId: string | null = null;
    if (dto.requestType === 'INTEGRITY_REVIEW') {
      const blockedAttempt = await db.quizAttempt.findFirst({
        where: { quizId: dto.quizId, traineeId, status: 'IN_PROGRESS', integrityBlockedAt: { not: null } },
      });
      if (!quiz.integrityMonitoringEnabled || !blockedAttempt) throw new BadRequestException('لا توجد محاولة موقوفة مؤهلة لطلب المراجعة');
      attemptId = blockedAttempt.id;
    } else if (dto.requestType === 'MISSED_EXAM') {
      if (!quiz.isPublished || !quiz.isActive) throw new BadRequestException('لا يمكن تقديم طلب لهذا الاختبار حالياً');
      if (new Date() <= quiz.endDate) throw new BadRequestException('يمكن تقديم طلب الاختبار الفائت بعد انتهاء موعده');
      const priorAttempt = await db.quizAttempt.findFirst({ where: { quizId: dto.quizId, traineeId } });
      if (priorAttempt) throw new BadRequestException('لديك محاولة مسجلة لهذا الاختبار؛ اختر طلب مراجعة المحاولة إن كانت موقوفة');
    } else {
      throw new BadRequestException('نوع الطلب غير صالح');
    }

    const pending = await db.quizAccessRequest.findFirst({ where: { quizId: dto.quizId, traineeId, status: 'PENDING' } });
    if (pending) throw new BadRequestException('لديك طلب قيد المراجعة لهذا الاختبار بالفعل');
    return db.quizAccessRequest.create({
      data: { quizId: dto.quizId, traineeId, attemptId, requestType: dto.requestType, reason: dto.reason.trim() },
      include: { quiz: { select: { title: true } } },
    });
  }

  async reviewQuizAccessRequest(requestId: number, dto: { decision: 'APPROVED' | 'REJECTED'; reviewNotes?: string; scheduledStartAt?: string; scheduledEndAt?: string }, reviewerId: string) {
    const db = this.prisma as any;
    const request = await db.quizAccessRequest.findUnique({
      where: { id: requestId },
      include: { quiz: { include: { questions: true } }, trainee: true },
    });
    if (!request) throw new NotFoundException('الطلب غير موجود');
    if (request.status !== 'PENDING') throw new BadRequestException('تمت مراجعة هذا الطلب مسبقاً');
    if (!['APPROVED', 'REJECTED'].includes(dto.decision)) throw new BadRequestException('قرار المراجعة غير صالح');

    let startAt: Date | null = null;
    let endAt: Date | null = null;
    if (dto.decision === 'APPROVED') {
      startAt = dto.scheduledStartAt ? new Date(dto.scheduledStartAt) : null;
      endAt = dto.scheduledEndAt ? new Date(dto.scheduledEndAt) : null;
      if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt || endAt <= new Date()) {
        throw new BadRequestException('حدد بداية ونهاية مستقبلية صحيحتين لفترة أداء الاختبار');
      }
      if (request.requestType === 'INTEGRITY_REVIEW') {
        if (!request.attemptId) throw new BadRequestException('المحاولة المرتبطة بالطلب غير موجودة');
        await db.quizAttempt.update({
          where: { id: request.attemptId },
          data: { integrityBlockedAt: null, integrityAllowedStartAt: startAt, integrityAllowedEndAt: endAt, integrityAllowedByUserId: reviewerId, integrityBlockReason: null },
        });
      } else {
        const existingAttempt = await db.quizAttempt.findFirst({ where: { quizId: request.quizId, traineeId: request.traineeId } });
        if (existingAttempt) throw new BadRequestException('ظهرت محاولة لهذا المتدرب بعد تقديم الطلب؛ راجع المحاولة قبل الموافقة');
        const totalPoints = request.quiz.questions.reduce((total: number, question: any) => total + question.points, 0);
        const createdAttempt = await db.quizAttempt.create({
          data: { quizId: request.quizId, traineeId: request.traineeId, attemptNumber: 1, totalPoints, status: 'IN_PROGRESS', integrityAllowedStartAt: startAt, integrityAllowedEndAt: endAt },
        });
        await db.quizAccessRequest.update({ where: { id: requestId }, data: { attemptId: createdAttempt.id } });
      }
    }

    return db.quizAccessRequest.update({
      where: { id: requestId },
      data: {
        status: dto.decision,
        reviewNotes: dto.reviewNotes?.slice(0, 2000) || null,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        scheduledStartAt: startAt,
        scheduledEndAt: endAt,
      },
      include: { trainee: { select: { id: true, nameAr: true, nationalId: true } }, quiz: { select: { id: true, title: true } } },
    });
  }

  /**
   * الحصول على محاولة مع الأسئلة
   */
  private async getAttemptWithQuestions(attemptId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            trainingContent: {
              select: {
                id: true,
                name: true,
                code: true,
                classroom: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        answers: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('المحاولة غير موجودة');
    }

    // خلط الأسئلة إذا كان مطلوباً
    if (attempt.quiz.shuffleQuestions) {
      attempt.quiz.questions = this.shuffleArray(attempt.quiz.questions);
    }

    // خلط الخيارات إذا كان مطلوباً
    if (attempt.quiz.shuffleAnswers) {
      attempt.quiz.questions.forEach((q) => {
        q.question.options = this.shuffleArray(q.question.options);
      });
    }

    return attempt;
  }

  /**
   * دالة لخلط عناصر المصفوفة
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * تسليم إجابة سؤال
   */
  async submitAnswer(traineeId: number, submitAnswerDto: SubmitAnswerDto) {
    const { attemptId, questionId, selectedAnswer, textAnswer } = submitAnswerDto;

    // التحقق من المحاولة
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            requiredFee: { select: { id: true, name: true, amount: true, programId: true } },
            trainingContent: { select: { programId: true } },
            questions: {
              where: { questionId },
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('المحاولة غير موجودة');
    }

    // التحقق من أن المحاولة تخص المتدرب
    if (attempt.traineeId !== traineeId) {
      throw new ForbiddenException('غير مسموح لك بالوصول إلى هذه المحاولة');
    }

    await this.assertPaymentScheduleAllowsQuizzes(traineeId);
    await this.assertRequiredFeePaid(attempt.quiz, traineeId);
    if ((attempt as any).integrityBlockedAt) throw new ForbiddenException('تم إيقاف المحاولة لتجاوز حد مغادرات صفحة الاختبار. قدّم طلب مراجعة من صفحة الاختبارات.');
    this.assertApprovedAttemptWindow(attempt);
    this.assertAttemptPlatform((attempt.quiz as any).deliveryPlatform || 'WEB', submitAnswerDto.platform);

    // التحقق من أن المحاولة قيد التنفيذ
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('المحاولة غير قيد التنفيذ');
    }

    // التحقق من أن السؤال موجود في الاختبار
    const quizQuestion = attempt.quiz.questions[0];
    if (!quizQuestion) {
      throw new BadRequestException('السؤال غير موجود في هذا الاختبار');
    }

    // التحقق من صحة الإجابة
    const question = quizQuestion.question;
    let isCorrect = false;
    let points = 0;

    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
      const correctOption = question.options.find((opt) => opt.isCorrect);
      if (correctOption && selectedAnswer === correctOption.id.toString()) {
        isCorrect = true;
        points = quizQuestion.points;
      }
    }

    // حفظ أو تحديث الإجابة
    const answer = await this.prisma.quizAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      create: {
        attemptId,
        questionId,
        selectedAnswer,
        textAnswer,
        isCorrect,
        points,
      },
      update: {
        selectedAnswer,
        textAnswer,
        isCorrect,
        points,
      },
    });

    return answer;
  }

  /**
   * تسليم الاختبار
   */
  async submitQuiz(traineeId: number, submitQuizDto: SubmitQuizDto) {
    const { attemptId } = submitQuizDto;

    // الحصول على المحاولة
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            requiredFee: { select: { id: true, name: true, amount: true, programId: true } },
            trainingContent: { select: { programId: true } },
          },
        },
        answers: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('المحاولة غير موجودة');
    }

    // التحقق من أن المحاولة تخص المتدرب
    if (attempt.traineeId !== traineeId) {
      throw new ForbiddenException('غير مسموح لك بالوصول إلى هذه المحاولة');
    }

    await this.assertPaymentScheduleAllowsQuizzes(traineeId);
    await this.assertRequiredFeePaid(attempt.quiz, traineeId);
    if ((attempt as any).integrityBlockedAt) throw new ForbiddenException('تم إيقاف المحاولة لتجاوز حد مغادرات صفحة الاختبار. قدّم طلب مراجعة من صفحة الاختبارات.');
    this.assertApprovedAttemptWindow(attempt);
    this.assertAttemptPlatform((attempt.quiz as any).deliveryPlatform || 'WEB', submitQuizDto.platform);

    // التحقق من أن المحاولة قيد التنفيذ
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('المحاولة تم تسليمها مسبقاً');
    }

    // حساب النتيجة
    const score = attempt.answers.reduce((sum, ans) => sum + (ans.points || 0), 0);
    const percentage = attempt.totalPoints > 0 ? (score / attempt.totalPoints) * 100 : 0;
    const passed = percentage >= attempt.quiz.passingScore;

    // حساب المدة الفعلية
    const duration = Math.floor((new Date().getTime() - attempt.startedAt.getTime()) / 1000);

    // تحديث المحاولة
    const updatedAttempt = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        duration,
        score,
        percentage,
        passed,
      },
      include: {
        quiz: {
          include: {
            trainingContent: true,
          },
        },
        answers: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    // تحديث درجات الاختبارات المصغرة في نظام الدرجات
    await this.updateQuizGrades(traineeId, attempt.quiz.trainingContentId);

    return updatedAttempt;
  }

  /**
   * إعادة حساب درجات الاختبارات لجميع المتدربين الذين قدموا اختبارات في هذه المادة
   * يُستدعى عند نشر/إلغاء نشر/تفعيل/تعطيل اختبار
   */
  async recalculateAllQuizGradesForContent(contentId: number): Promise<{ updated: number; errors: number }> {
    console.log(`📊 [Quiz Recalc] بدء إعادة حساب درجات كل المتدربين للمادة ${contentId}...`);
    
    // جلب كل المتدربين الذين لديهم محاولة واحدة على الأقل في اختبارات هذه المادة
    const traineesWithAttempts = await this.prisma.quizAttempt.findMany({
      where: {
        quiz: {
          trainingContentId: contentId,
        },
        status: 'SUBMITTED',
      },
      select: {
        traineeId: true,
      },
      distinct: ['traineeId'],
    });

    const traineeIds = traineesWithAttempts.map(t => t.traineeId);
    console.log(`📊 [Quiz Recalc] وجد ${traineeIds.length} متدرب لإعادة حساب درجاتهم`);

    let updated = 0;
    let errors = 0;

    for (const traineeId of traineeIds) {
      try {
        await this.updateQuizGrades(traineeId, contentId);
        updated++;
      } catch (error) {
        errors++;
        console.error(`❌ [Quiz Recalc] خطأ في إعادة حساب درجة المتدرب ${traineeId}:`, error);
      }
    }

    console.log(`✅ [Quiz Recalc] اكتمل: ${updated} تحديث ناجح، ${errors} أخطاء`);
    return { updated, errors };
  }

  /**
   * تحديث درجات الاختبارات المصغرة في نظام الدرجات
   */
  private async updateQuizGrades(traineeId: number, contentId: number) {
    try {
      // الحصول على المحتوى التدريبي
      const content = await this.prisma.trainingContent.findUnique({
        where: { id: contentId },
        select: {
          quizzesMarks: true,
          classroomId: true,
        },
      });

      if (!content) {
        return;
      }

      // الحصول على جميع الاختبارات المنشورة لهذه المادة
      const totalQuizzes = await this.prisma.quiz.count({
        where: {
          trainingContentId: contentId,
          isPublished: true,
          isActive: true,
          gradeAllocation: null,
        },
      });

      if (totalQuizzes === 0) {
        await this.updateAssignedQuizContributions(traineeId, contentId, content.classroomId);
        return;
      }

      const assignedQuizCapacity = await this.prisma.quiz.aggregate({
        where: { trainingContentId: contentId, isPublished: true, isActive: true, gradeAllocation: { not: null }, gradeComponentKey: 'quizzesMarks' },
        _sum: { gradeAllocation: true },
      });
      // يحتفظ بالآلية القديمة للاختبارات غير المخصصة، بعد خصم ما حُجز للاختبارات المخصصة.
      const marksPerQuiz = Math.max(0, content.quizzesMarks - Number(assignedQuizCapacity._sum.gradeAllocation || 0)) / totalQuizzes;

      // الحصول على أفضل محاولة للمتدرب في كل اختبار
      const quizzes = await this.prisma.quiz.findMany({
        where: {
          trainingContentId: contentId,
          isPublished: true,
          isActive: true,
          gradeAllocation: null,
        },
        select: {
          id: true,
        },
      });

      let totalEarned = 0;

      for (const quiz of quizzes) {
        // الحصول على أفضل محاولة للمتدرب في هذا الاختبار
        const bestAttempt = await this.prisma.quizAttempt.findFirst({
          where: {
            quizId: quiz.id,
            traineeId,
            status: 'SUBMITTED',
          },
          orderBy: {
            percentage: 'desc',
          },
          select: {
            percentage: true,
          },
        });

        if (bestAttempt) {
          // حساب الدرجة المحصلة من هذا الاختبار
          const earnedFromQuiz = (bestAttempt.percentage / 100) * marksPerQuiz;
          totalEarned += earnedFromQuiz;
        }
      }

      // الدرجة النهائية للاختبارات المصغرة
      const quizGrade = totalEarned;

      // تحديث أو إنشاء سجل الدرجات
      await this.prisma.traineeGrades.upsert({
        where: {
          traineeId_trainingContentId_classroomId: {
            traineeId,
            trainingContentId: contentId,
            classroomId: content.classroomId,
          },
        },
        create: {
          traineeId,
          trainingContentId: contentId,
          classroomId: content.classroomId,
          quizzesMarks: quizGrade,
          yearWorkMarks: 0,
          practicalMarks: 0,
          writtenMarks: 0,
          attendanceMarks: 0,
          finalExamMarks: 0,
          totalMarks: quizGrade,
        },
        update: {
          quizzesMarks: quizGrade,
        },
      });

      // إعادة حساب المجموع الكلي
      const updatedGrade = await this.prisma.traineeGrades.findUnique({
        where: {
          traineeId_trainingContentId_classroomId: {
            traineeId,
            trainingContentId: contentId,
            classroomId: content.classroomId,
          },
        },
      });

      if (updatedGrade) {
        const newTotal =
          (updatedGrade.yearWorkMarks || 0) +
          (updatedGrade.practicalMarks || 0) +
          (updatedGrade.writtenMarks || 0) +
          (updatedGrade.attendanceMarks || 0) +
          (updatedGrade.quizzesMarks || 0) +
          (updatedGrade.finalExamMarks || 0);

        await this.prisma.traineeGrades.update({
          where: {
            traineeId_trainingContentId_classroomId: {
              traineeId,
              trainingContentId: contentId,
              classroomId: content.classroomId,
            },
          },
          data: {
            totalMarks: newTotal,
          },
        });
      }

      await this.updateAssignedQuizContributions(traineeId, contentId, content.classroomId);
    } catch (error) {
      console.error('Error updating quiz grades:', error);
    }
  }

  private async updateAssignedQuizContributions(traineeId: number, contentId: number, classroomId: number) {
    const activeLegacyCount = await this.prisma.quiz.count({
      where: { trainingContentId: contentId, isPublished: true, isActive: true, gradeAllocation: null },
    });
    const quizzes = await this.prisma.quiz.findMany({
      where: { trainingContentId: contentId, isPublished: true, isActive: true, gradeAllocation: { not: null } },
      select: { id: true, gradeAllocation: true, gradeComponentKey: true },
    });
    const oldRows = await this.prisma.quizGradeContribution.findMany({ where: { traineeId, trainingContentId: contentId } });
    const oldByComponent = new Map<string, number>();
    for (const row of oldRows) oldByComponent.set(row.componentKey, (oldByComponent.get(row.componentKey) || 0) + row.earnedMarks);

    const newByComponent = new Map<string, number>();
    for (const quiz of quizzes) {
      const attempt = await this.prisma.quizAttempt.findFirst({
        where: { quizId: quiz.id, traineeId, status: 'SUBMITTED' },
        orderBy: { percentage: 'desc' }, select: { percentage: true },
      });
      const earned = attempt ? (Number(attempt.percentage || 0) / 100) * Number(quiz.gradeAllocation || 0) : 0;
      const key = quiz.gradeComponentKey || 'quizzesMarks';
      newByComponent.set(key, (newByComponent.get(key) || 0) + earned);
      await this.prisma.quizGradeContribution.upsert({
        where: { quizId_traineeId: { quizId: quiz.id, traineeId } },
        create: { quizId: quiz.id, traineeId, trainingContentId: contentId, componentKey: key, earnedMarks: earned },
        update: { componentKey: key, earnedMarks: earned },
      });
    }

    let grade = await this.prisma.traineeGrades.findUnique({
      where: { traineeId_trainingContentId_classroomId: { traineeId, trainingContentId: contentId, classroomId } },
    });
    const fields = ['yearWorkMarks', 'practicalMarks', 'writtenMarks', 'attendanceMarks', 'quizzesMarks', 'finalExamMarks'];
    if (!grade && newByComponent.size) {
      const initial: Record<string, number> = { yearWorkMarks: 0, practicalMarks: 0, writtenMarks: 0, attendanceMarks: 0, quizzesMarks: 0, finalExamMarks: 0 };
      for (const [key, value] of newByComponent) initial[key] = value;
      grade = await this.prisma.traineeGrades.create({
        data: { traineeId, trainingContentId: contentId, classroomId, ...initial, totalMarks: Object.values(initial).reduce((sum, value) => sum + value, 0) },
      });
    }
    if (!grade) return;
    const data: Record<string, number> = {};
    for (const key of fields) {
      const deltaBase = key === 'quizzesMarks'
        ? (activeLegacyCount === 0 ? 0 : Number((grade as any)[key] || 0))
        : Number((grade as any)[key] || 0) - (oldByComponent.get(key) || 0);
      const next = Math.max(0, deltaBase + (newByComponent.get(key) || 0));
      if (Math.abs(next - Number((grade as any)[key] || 0)) > 0.0001) data[key] = next;
    }
    if (Object.keys(data).length) {
      const nextGrade = { ...grade, ...data };
      const totalMarks = fields.reduce((sum, key) => sum + Number((nextGrade as any)[key] || 0), 0);
      await this.prisma.traineeGrades.update({
        where: { traineeId_trainingContentId_classroomId: { traineeId, trainingContentId: contentId, classroomId } },
        data: { ...data, totalMarks: Math.round(totalMarks * 100) / 100 },
      });
    }
  }

  /**
   * الحصول على الاختبارات المتاحة للمتدرب
   */
  async getAvailableQuizzes(traineeId: number) {
    const paymentStatus = await this.paymentStatusService.checkTraineePaymentStatus(traineeId);
    const paymentActionBlocked = !paymentStatus.canAccessQuizzes;
    const paymentActionFeesById = new Map<number, { feeId: number; feeName: string; remainingAmount: number }>();
    for (const payment of paymentStatus.overduePayments || []) {
      if (!payment.actions?.includes(NonPaymentAction.DISABLE_QUIZZES) && !payment.actions?.includes(NonPaymentAction.DISABLE_ALL)) continue;
      const fee = paymentActionFeesById.get(payment.feeId) || {
        feeId: payment.feeId,
        feeName: payment.feeName,
        remainingAmount: 0,
      };
      fee.remainingAmount += Math.max(0, Number(payment.remainingAmount || 0));
      paymentActionFeesById.set(payment.feeId, fee);
    }
    const paymentActionFees = Array.from(paymentActionFeesById.values());
    const paymentBlockMessage = paymentActionFees.map(fee => fee.feeName).join('، ');
    // الحصول على معلومات المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: {
        programId: true,
      },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    const mobileAppSettings = await this.getMobileAppSettings();

    // الحصول على جميع الاختبارات المتاحة لبرنامج المتدرب
    const quizzes = await this.prisma.quiz.findMany({
      where: {
        isActive: true,
        isPublished: true,
        trainingContent: {
          programId: trainee.programId,
        },
      },
      include: {
        trainingContent: {
          select: {
            id: true,
            name: true,
            code: true,
            programId: true,
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        requiredFee: { select: { id: true, name: true, amount: true, programId: true } },
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    const requiredFeeIds = [...new Set(quizzes
      .filter(quiz => quiz.feeRequirementEnabled && quiz.requiredFeeId)
      .map(quiz => quiz.requiredFeeId as number))];
    const feePayments = requiredFeeIds.length
      ? await this.prisma.traineePayment.findMany({
          where: { traineeId, feeId: { in: requiredFeeIds } },
          select: { feeId: true, amount: true, feeAmount: true, paidAmount: true, feePaidAmount: true, status: true },
        })
      : [];
    const feeExceptions = requiredFeeIds.length
      ? await this.prisma.traineePaymentException.findMany({
          where: { traineeId, OR: [{ feeId: { in: requiredFeeIds } }, { feeId: null }] },
          orderBy: { createdAt: 'desc' },
          select: { id: true, feeId: true, customPaymentEndDate: true, customGracePeriodDays: true, customFinalDeadline: true },
        })
      : [];
    const paymentsByFeeId = new Map<number, typeof feePayments>();
    for (const payment of feePayments) {
      const current = paymentsByFeeId.get(payment.feeId) || [];
      current.push(payment);
      paymentsByFeeId.set(payment.feeId, current);
    }

    // إضافة معلومات عن حالة الاختبار لكل متدرب
    const now = new Date();
    const quizzesWithAttempts = await Promise.all(
      quizzes.map(async (quiz) => {
        const db = this.prisma as any;
        const [completedAttempt, inProgressAttempt, accessRequest, anyAttempt] = await Promise.all([
          this.prisma.quizAttempt.findFirst({ where: { quizId: quiz.id, traineeId, status: 'SUBMITTED' } }),
          db.quizAttempt.findFirst({ where: { quizId: quiz.id, traineeId, status: 'IN_PROGRESS' } }),
          db.quizAccessRequest.findFirst({ where: { quizId: quiz.id, traineeId }, orderBy: { createdAt: 'desc' } }),
          this.prisma.quizAttempt.findFirst({ where: { quizId: quiz.id, traineeId }, select: { id: true } }),
        ]);
        const overrideStart = accessRequest?.status === 'APPROVED' ? accessRequest.scheduledStartAt : (inProgressAttempt as any)?.integrityAllowedStartAt;
        const overrideEnd = accessRequest?.status === 'APPROVED' ? accessRequest.scheduledEndAt : (inProgressAttempt as any)?.integrityAllowedEndAt;
        const effectiveStart = overrideStart || quiz.startDate;
        const effectiveEnd = overrideEnd || quiz.endDate;

        const status = completedAttempt
          ? 'completed'
          : now < effectiveStart
          ? 'upcoming'
          : now > effectiveEnd
          ? 'ended'
          : 'available';

        const feePaymentsForQuiz = quiz.requiredFeeId ? paymentsByFeeId.get(quiz.requiredFeeId) || [] : [];
        const feePaymentSummary = this.summarizeFeePayments(
          feePaymentsForQuiz,
          Number(quiz.requiredFee?.amount || 0),
        );
        const feeTotalDue = feePaymentSummary.totalDue;
        const feeTotalPaid = feePaymentSummary.totalPaid;
        const isFeePaid = feePaymentSummary.isFullyPaid;
        const feeException = quiz.requiredFeeId && !isFeePaid
          ? this.resolveActivePaymentException(feeExceptions, quiz.requiredFeeId, now)
          : null;
        const feeAccessAllowed = isFeePaid || Boolean(feeException);
        const feeRequirement = quiz.feeRequirementEnabled
          ? {
              required: true,
              feeId: quiz.requiredFeeId,
              feeName: quiz.requiredFee?.name || 'الرسم المحدد',
              totalAmount: feeTotalDue || Number(quiz.requiredFee?.amount || 0),
              paidAmount: feeTotalPaid,
              remainingAmount: Math.max(0, (feeTotalDue || Number(quiz.requiredFee?.amount || 0)) - feeTotalPaid),
              isPaid: isFeePaid,
              isAccessAllowed: feeAccessAllowed,
              exceptionDeadline: feeException?.deadline || null,
            }
          : { required: false, feeId: null, feeName: null, totalAmount: 0, paidAmount: 0, remainingAmount: 0, isPaid: true, isAccessAllowed: true, exceptionDeadline: null };
        const feesRequiredToUnlock = [...paymentActionFees];
        if (feeRequirement.required && !feeRequirement.isPaid && feeRequirement.feeId !== null) {
          const existingFee = feesRequiredToUnlock.find(fee => fee.feeId === feeRequirement.feeId);
          if (existingFee) {
            // The individual quiz requirement may cover installments that are not
            // overdue yet, so show the full amount needed to satisfy both rules.
            existingFee.remainingAmount = Math.max(existingFee.remainingAmount, feeRequirement.remainingAmount);
          } else {
            feesRequiredToUnlock.push({
              feeId: feeRequirement.feeId,
              feeName: feeRequirement.feeName || 'الرسم المحدد للاختبار',
              remainingAmount: feeRequirement.remainingAmount,
            });
          }
        }
        const mobileOnly = (quiz as any).deliveryPlatform === 'MOBILE';
        const integrityBlocked = !!(inProgressAttempt as any)?.integrityBlockedAt;
        const canAttempt = status === 'available' && feeRequirement.isAccessAllowed && !mobileOnly && !integrityBlocked && !paymentActionBlocked;

        return {
          ...quiz,
          isCompleted: !!completedAttempt,
          hasInProgress: !!inProgressAttempt,
          integrityBlocked,
          tabDepartureCount: (inProgressAttempt as any)?.tabDepartureCount || 0,
          missedExamRequestEligible: status === 'ended' && !anyAttempt,
          accessRequest: accessRequest ? {
            id: accessRequest.id,
            type: accessRequest.requestType,
            status: accessRequest.status,
            reason: accessRequest.reason,
            reviewNotes: accessRequest.reviewNotes,
            scheduledStartAt: accessRequest.scheduledStartAt,
            scheduledEndAt: accessRequest.scheduledEndAt,
            createdAt: accessRequest.createdAt,
          } : null,
          result: completedAttempt ? {
            id: completedAttempt.id,
            score: completedAttempt.score,
            percentage: completedAttempt.percentage,
            passed: completedAttempt.passed,
            submittedAt: completedAttempt.submittedAt,
          } : null,
          status,
          canAttempt,
          feeRequirement,
          paymentActionBlocked,
          paymentBlockMessage,
          feesRequiredToUnlock,
          mobileApp: mobileOnly ? mobileAppSettings : null,
          isMobileOnly: mobileOnly,
          integrityMonitoringEnabled: (quiz as any).integrityMonitoringEnabled || false,
          maxTabDepartures: (quiz as any).maxTabDepartures ?? 3,
        };
      }),
    );

    return quizzesWithAttempts;
  }

  /**
   * الحصول على نتيجة محاولة معينة
   */
  async getAttemptResult(traineeId: number, attemptId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            trainingContent: true,
          },
        },
        answers: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('المحاولة غير موجودة');
    }

    // التحقق من أن المحاولة تخص المتدرب
    if (attempt.traineeId !== traineeId) {
      throw new ForbiddenException('غير مسموح لك بالوصول إلى هذه المحاولة');
    }

    // التحقق من أن الاختبار يسمح بعرض النتائج
    if (!attempt.quiz.showResults && attempt.status !== 'SUBMITTED') {
      throw new ForbiddenException('النتائج غير متاحة حالياً');
    }

    return attempt;
  }
}

