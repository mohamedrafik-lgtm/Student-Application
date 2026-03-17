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

  // تحديث الجلسة
  async updateSession(sessionId: string, data: any) {
    const session = await this.prisma.batchGradingSession.update({
      where: { id: sessionId },
      data: {
        status: data.status,
        currentIndex: data.currentIndex,
        completedCount: data.completedCount,
        skippedCount: data.skippedCount,
        alreadyGradedCount: data.alreadyGradedCount,
        failedCount: data.failedCount,
        endTime: data.status === 'COMPLETED' ? new Date() : undefined,
      },
    });
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
  async getSessionDetails(sessionId: string) {
    const session = await this.prisma.batchGradingSession.findUnique({
      where: { id: sessionId },
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
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  // حذف جلسة
  async deleteSession(sessionId: string) {
    await this.prisma.batchGradingSession.delete({
      where: { id: sessionId },
    });
    return { message: 'Session deleted successfully' };
  }

  // إضافة ورقة مصححة سابقاً
  async addAlreadyGraded(sessionId: string, data: any) {
    const alreadyGraded = await this.prisma.batchGradingAlreadyGraded.create({
      data: {
        sessionId,
        pageNumber: data.pageNumber,
        nationalId: data.nationalId,
        studentName: data.studentName,
        previousScore: data.previousScore,
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
  async addResult(sessionId: string, resultData: any) {
    const result = await this.prisma.batchGradingResult.create({
      data: {
        sessionId,
        sheetId: resultData.sheetId,
        pageNumber: resultData.pageNumber,
        studentName: resultData.studentName,
        nationalId: resultData.nationalId,
        score: resultData.score,
        totalQuestions: resultData.totalQuestions,
        answeredQuestions: resultData.answeredQuestions,
        correctAnswers: resultData.correctAnswers,
        wrongAnswers: resultData.wrongAnswers,
        answersDetail: resultData.answersDetail,
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
  async addSkipped(sessionId: string, skippedData: any) {
    const skipped = await this.prisma.batchGradingSkipped.create({
      data: {
        sessionId,
        pageNumber: skippedData.pageNumber,
        reason: skippedData.reason,
        nationalId: skippedData.nationalId,
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
  async addFailure(sessionId: string, failureData: any) {
    const failure = await this.prisma.batchGradingFailure.create({
      data: {
        sessionId,
        pageNumber: failureData.pageNumber,
        error: failureData.error,
        nationalId: failureData.nationalId,
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
}
