import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BatchGradingService {
  constructor(private prisma: PrismaService) {}

  // إنشاء جلسة جديدة
  async createSession(examId: number, fileName: string, filePath: string, totalPages: number, createdBy: string) {
    const session = await this.prisma.batchGradingSession.create({
      data: {
        paperExamId: examId,
        fileName,
        filePath,
        totalPages,
        createdBy,
        status: 'PROCESSING',
      },
    });
    return session;
  }

  private async assertSessionBelongsToExam(examId: number, sessionId: string) {
    const session = await this.prisma.batchGradingSession.findFirst({
      where: { id: sessionId, paperExamId: examId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException('جلسة التصحيح غير موجودة لهذا الاختبار');
    }
  }

  // تحديث الجلسة
  async updateSession(examId: number, sessionId: string, data: any) {
    await this.assertSessionBelongsToExam(examId, sessionId);
    const session = await this.prisma.batchGradingSession.update({
      where: { id: sessionId },
      data: {
        status: data.status,
        currentIndex: data.currentIndex,
        completedCount: data.completedCount,
        skippedCount: data.skippedCount,
        alreadyGradedCount: data.alreadyGradedCount,
        failedCount: data.failedCount,
        endTime: data.status === 'COMPLETED' || data.status === 'FAILED' ? new Date() : undefined,
      },
    });
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      await this.reconcileNotReached(examId, sessionId);
    }
    return session;
  }

  // الحصول على جميع الجلسات لامتحان
  async getSessions(examId: number) {
    const sessions = await this.prisma.batchGradingSession.findMany({
      where: { paperExamId: examId },
      orderBy: { startTime: 'desc' },
    });
    return sessions;
  }

  // الحصول على تفاصيل جلسة
  async getSessionDetails(examId: number, sessionId: string) {
    await this.reconcileNotReached(examId, sessionId);
    const session = await this.prisma.batchGradingSession.findFirst({
      where: { id: sessionId, paperExamId: examId },
      include: {
        results: {
          orderBy: { pageNumber: 'asc' },
        },
        skipped: {
          orderBy: { pageNumber: 'asc' },
        },
        alreadyGraded: {
          orderBy: { pageNumber: 'asc' },
        },
        failures: {
          orderBy: { pageNumber: 'asc' },
        },
        notReached: {
          orderBy: { traineeName: 'asc' },
          include: {
            answerSheet: {
              select: { status: true, score: true, percentage: true, passed: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  // حذف جلسة
  async deleteSession(examId: number, sessionId: string) {
    await this.assertSessionBelongsToExam(examId, sessionId);
    await this.prisma.batchGradingSession.delete({
      where: { id: sessionId },
    });
    return { message: 'Session deleted successfully' };
  }

  // إضافة ورقة مصححة سابقاً
  async addAlreadyGraded(examId: number, sessionId: string, data: any) {
    await this.assertSessionBelongsToExam(examId, sessionId);
    const alreadyGraded = await this.prisma.batchGradingAlreadyGraded.create({
      data: {
        sessionId,
        pageNumber: data.pageNumber,
        nationalId: data.nationalId,
        studentName: data.studentName,
        previousScore: data.previousScore,
        traineeId: Number.isInteger(data.traineeId) ? data.traineeId : null,
      },
    });

    // تحديث عداد المصححة سابقاً
    await this.prisma.batchGradingSession.update({
      where: { id: sessionId },
      data: {
        alreadyGradedCount: { increment: 1 },
        currentIndex: data.pageNumber,
      },
    });

    return alreadyGraded;
  }

  // إضافة نتيجة ناجحة
  async addResult(examId: number, sessionId: string, resultData: any) {
    await this.assertSessionBelongsToExam(examId, sessionId);
    const answerSheet = await this.prisma.paperAnswerSheet.findFirst({
      where: { id: resultData.sheetId, paperExamId: examId },
      select: {
        id: true,
        traineeId: true,
        status: true,
        score: true,
        trainee: { select: { nameAr: true, nationalId: true } },
        model: {
          select: {
            questions: {
              select: { questionId: true },
              orderBy: { orderInModel: 'asc' },
            },
          },
        },
        answers: {
          select: { questionId: true, selectedOptionId: true, isCorrect: true, points: true, confidence: true },
        },
      },
    });
    if (!answerSheet) {
      throw new NotFoundException('ورقة الإجابة لا تنتمي إلى الاختبار المحدد');
    }
    if (!['GRADED', 'VERIFIED'].includes(answerSheet.status) || answerSheet.score === null) {
      throw new NotFoundException('لا توجد درجة معتمدة لهذه الورقة حتى تُضاف إلى سجل الجلسة');
    }
    const answersByQuestion = new Map(answerSheet.answers.map((answer) => [answer.questionId, answer]));
    const answersDetail = answerSheet.model.questions.map((question, index) => {
      const answer = answersByQuestion.get(question.questionId);
      return {
        questionNumber: index + 1,
        questionId: question.questionId,
        selectedOptionId: answer?.selectedOptionId ?? null,
        isCorrect: answer?.isCorrect ?? false,
        points: answer?.points ?? 0,
        confidence: answer?.confidence ?? null,
      };
    });
    const answeredQuestions = answersDetail.filter((answer) => answer.selectedOptionId !== null).length;
    const correctAnswers = answersDetail.filter((answer) => answer.isCorrect).length;
    const result = await this.prisma.batchGradingResult.create({
      data: {
        sessionId,
        sheetId: resultData.sheetId,
        traineeId: answerSheet.traineeId,
        pageNumber: resultData.pageNumber,
        studentName: answerSheet.trainee.nameAr,
        nationalId: answerSheet.trainee.nationalId,
        score: answerSheet.score,
        totalQuestions: answerSheet.model.questions.length,
        answeredQuestions,
        correctAnswers,
        wrongAnswers: Math.max(0, answeredQuestions - correctAnswers),
        answersDetail,
      },
    });

    // تحديث عداد النتائج
    await this.prisma.batchGradingSession.update({
      where: { id: sessionId },
      data: {
        completedCount: { increment: 1 },
        currentIndex: resultData.pageNumber,
      },
    });

    return result;
  }

  // إضافة ورقة متجاهلة
  async addSkipped(examId: number, sessionId: string, skippedData: any) {
    await this.assertSessionBelongsToExam(examId, sessionId);
    const skipped = await this.prisma.batchGradingSkipped.create({
      data: {
        sessionId,
        pageNumber: skippedData.pageNumber,
        reason: skippedData.reason,
        nationalId: skippedData.nationalId,
        traineeId: Number.isInteger(skippedData.traineeId) ? skippedData.traineeId : null,
      },
    });

    // تحديث عداد المتجاهلة
    await this.prisma.batchGradingSession.update({
      where: { id: sessionId },
      data: {
        skippedCount: { increment: 1 },
        currentIndex: skippedData.pageNumber,
      },
    });

    return skipped;
  }

  // إضافة حالة فشل
  async addFailure(examId: number, sessionId: string, failureData: any) {
    await this.assertSessionBelongsToExam(examId, sessionId);
    const failure = await this.prisma.batchGradingFailure.create({
      data: {
        sessionId,
        pageNumber: failureData.pageNumber,
        error: failureData.error,
        nationalId: failureData.nationalId,
        traineeId: Number.isInteger(failureData.traineeId) ? failureData.traineeId : null,
      },
    });

    // تحديث عداد الفشل
    await this.prisma.batchGradingSession.update({
      where: { id: sessionId },
      data: {
        failedCount: { increment: 1 },
        currentIndex: failureData.pageNumber,
      },
    });

    return failure;
  }

  private normalizeNationalId(value?: string | null) {
    return String(value || '')
      .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
      .replace(/\D/g, '');
  }

  private async reconcileNotReached(examId: number, sessionId: string) {
    const session = await this.prisma.batchGradingSession.findFirst({
      where: { id: sessionId, paperExamId: examId },
      select: { id: true, status: true, startTime: true },
    });
    if (!session) {
      throw new NotFoundException('جلسة التصحيح غير موجودة لهذا الاختبار');
    }
    if (session.status !== 'COMPLETED' && session.status !== 'FAILED') return;

    const [results, skipped, failures, answerSheets] = await Promise.all([
      this.prisma.batchGradingResult.findMany({
        where: { sessionId },
        select: { sheetId: true, nationalId: true },
      }),
      this.prisma.batchGradingSkipped.findMany({
        where: { sessionId },
        select: { nationalId: true, traineeId: true, reason: true },
      }),
      this.prisma.batchGradingFailure.findMany({
        where: { sessionId },
        select: { nationalId: true, traineeId: true, error: true },
      }),
      this.prisma.paperAnswerSheet.findMany({
        where: {
          paperExamId: examId,
          OR: [
            { status: { in: ['NOT_SUBMITTED', 'SUBMITTED'] } },
            // Include sheets graded during the batch even if saving the session result failed.
            { status: { in: ['GRADED', 'VERIFIED'] }, updatedAt: { gte: session.startTime } },
          ],
        },
        select: {
          id: true,
          traineeId: true,
          status: true,
          updatedAt: true,
          trainee: { select: { id: true, nameAr: true, nationalId: true } },
        },
      }),
    ]);

    const resultSheetIds = new Set(results.map((result) => result.sheetId));
    const attemptReasons = new Map<string, string>();
    for (const skippedRow of skipped) {
      const reason = `تم تخطي الصفحة: ${skippedRow.reason}`;
      if (Number.isInteger(skippedRow.traineeId)) attemptReasons.set(`trainee:${skippedRow.traineeId}`, reason);
      const nationalId = this.normalizeNationalId(skippedRow.nationalId);
      if (nationalId) attemptReasons.set(`national:${nationalId}`, reason);
    }
    for (const failureRow of failures) {
      const reason = `فشلت معالجة الصفحة: ${failureRow.error}`;
      if (Number.isInteger(failureRow.traineeId)) attemptReasons.set(`trainee:${failureRow.traineeId}`, reason);
      const nationalId = this.normalizeNationalId(failureRow.nationalId);
      if (nationalId) attemptReasons.set(`national:${nationalId}`, reason);
    }

    const unreached = answerSheets
      .filter((sheet) => !resultSheetIds.has(sheet.id))
      .map((sheet) => ({
        sessionId,
        answerSheetId: sheet.id,
        traineeId: sheet.trainee.id,
        traineeName: sheet.trainee.nameAr,
        nationalId: sheet.trainee.nationalId,
        sheetStatus: sheet.status,
        reason: attemptReasons.get(`trainee:${sheet.trainee.id}`) ||
          attemptReasons.get(`national:${this.normalizeNationalId(sheet.trainee.nationalId)}`) ||
          (['GRADED', 'VERIFIED'].includes(sheet.status)
            ? 'تم تصحيح الورقة أثناء الجلسة لكن لم تُسجل نتيجتها ضمن نتائج الجلسة'
            : 'لم تظهر ورقة المتدرب ضمن صفحات التصحيح التي اعتمدت لها نتيجة'),
      }));

    if (unreached.length > 0) {
      await this.prisma.batchGradingNotReached.createMany({
        data: unreached,
        skipDuplicates: true,
      });
    }
  }
}
