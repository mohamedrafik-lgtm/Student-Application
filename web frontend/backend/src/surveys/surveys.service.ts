import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SubmitSurveyResponseDto } from './dto/submit-survey.dto';

@Injectable()
export class SurveysService {
  constructor(private prisma: PrismaService) {}

  // ==================== Admin APIs ====================

  async create(dto: CreateSurveyDto, userId: string) {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
    }

    if (!dto.allPrograms && (!dto.programIds || dto.programIds.length === 0)) {
      throw new BadRequestException('يجب اختيار برنامج تدريبي واحد على الأقل أو تحديد جميع البرامج');
    }

    return this.prisma.survey.create({
      data: {
        title: dto.title,
        description: dto.description,
        allPrograms: dto.allPrograms,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdById: userId,
        programs: !dto.allPrograms && dto.programIds ? {
          create: dto.programIds.map(programId => ({ programId })),
        } : undefined,
        questions: {
          create: dto.questions.map((q, qIdx) => ({
            text: q.text,
            sortOrder: q.sortOrder ?? qIdx,
            options: {
              create: q.options.map((o, oIdx) => ({
                text: o.text,
                sortOrder: o.sortOrder ?? oIdx,
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          include: { options: true },
          orderBy: { sortOrder: 'asc' },
        },
        programs: { include: { program: true } },
        _count: { select: { responses: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.survey.findMany({
      include: {
        programs: { include: { program: { select: { id: true, nameAr: true } } } },
        _count: { select: { responses: true, questions: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
              include: { _count: { select: { answers: true } } },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        programs: { include: { program: { select: { id: true, nameAr: true } } } },
        _count: { select: { responses: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!survey) throw new NotFoundException('الاستبيان غير موجود');
    return survey;
  }

  async getStats(id: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            options: {
              include: { _count: { select: { answers: true } } },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { responses: true } },
      },
    });

    if (!survey) throw new NotFoundException('الاستبيان غير موجود');

    // حساب عدد المتدربين المستهدفين
    let targetCount = 0;
    if (survey.questions.length > 0) {
      // نحتاج فقط عدد المستهدفين
    }

    return {
      survey,
      totalResponses: survey._count.responses,
    };
  }

  async toggleActive(id: string) {
    const survey = await this.prisma.survey.findUnique({ where: { id } });
    if (!survey) throw new NotFoundException('الاستبيان غير موجود');

    return this.prisma.survey.update({
      where: { id },
      data: { isActive: !survey.isActive },
    });
  }

  async remove(id: string) {
    const survey = await this.prisma.survey.findUnique({ where: { id } });
    if (!survey) throw new NotFoundException('الاستبيان غير موجود');

    return this.prisma.survey.delete({ where: { id } });
  }

  // ==================== Trainee APIs ====================

  async findAvailableForTrainee(traineeId: number) {
    // جلب بيانات المتدرب مع البرنامج
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { programId: true },
    });

    if (!trainee) throw new NotFoundException('المتدرب غير موجود');

    const now = new Date();

    // جلب الاستبيانات المتاحة (فعّالة + في الفترة المحددة + للبرنامج أو لجميع البرامج)
    const surveys = await this.prisma.survey.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { allPrograms: true },
          { programs: { some: { programId: trainee.programId } } },
        ],
      },
      include: {
        questions: {
          include: { options: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        responses: {
          where: { traineeId },
          select: { id: true },
        },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // إضافة حقل isAnswered لكل استبيان
    return surveys.map(s => ({
      ...s,
      isAnswered: s.responses.length > 0,
      responses: undefined,
    }));
  }

  async submitResponse(surveyId: string, traineeId: number, dto: SubmitSurveyResponseDto) {
    // التحقق من الاستبيان
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: true },
    });

    if (!survey) throw new NotFoundException('الاستبيان غير موجود');
    if (!survey.isActive) throw new BadRequestException('الاستبيان غير فعّال');

    const now = new Date();
    if (now < survey.startDate || now > survey.endDate) {
      throw new BadRequestException('الاستبيان خارج الفترة المحددة');
    }

    // التحقق من عدم الإجابة المسبقة
    const existing = await this.prisma.surveyResponse.findUnique({
      where: { surveyId_traineeId: { surveyId, traineeId } },
    });

    if (existing) throw new ConflictException('لقد قمت بالإجابة على هذا الاستبيان مسبقاً');

    // التحقق من أن جميع الأسئلة مجاب عليها
    const questionIds = survey.questions.map(q => q.id);
    const answeredQuestionIds = dto.answers.map(a => a.questionId);
    
    for (const qId of questionIds) {
      if (!answeredQuestionIds.includes(qId)) {
        throw new BadRequestException('يجب الإجابة على جميع الأسئلة');
      }
    }

    // حفظ الإجابات
    return this.prisma.surveyResponse.create({
      data: {
        surveyId,
        traineeId,
        answers: {
          create: dto.answers.map(a => ({
            questionId: a.questionId,
            optionId: a.optionId,
          })),
        },
      },
      include: { answers: true },
    });
  }
}
