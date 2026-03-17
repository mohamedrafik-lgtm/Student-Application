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

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء اختبار جديد
   */
  async create(createQuizDto: CreateQuizDto) {
    const { questions, ...quizData } = createQuizDto;

    // التحقق من وجود المحتوى التدريبي
    const content = await this.prisma.trainingContent.findUnique({
      where: { id: quizData.trainingContentId },
    });

    if (!content) {
      throw new NotFoundException('المحتوى التدريبي غير موجود');
    }

    // التحقق من صحة التواريخ
    const startDate = new Date(quizData.startDate);
    const endDate = new Date(quizData.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
    }

    // إنشاء الاختبار مع الأسئلة
    const quiz = await this.prisma.quiz.create({
      data: {
        ...quizData,
        startDate,
        endDate,
        questions: {
          create: questions.map((q, index) => ({
            questionId: q.questionId,
            order: q.order ?? index,
            points: q.points ?? 1,
          })),
        },
      },
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

    // ✅ إذا أُنشئ الاختبار منشوراً ونشطاً → إعادة حساب درجات كل المتدربين (يتغير المقام)
    if (quiz.isPublished && quiz.isActive) {
      this.recalculateAllQuizGradesForContent(quiz.trainingContent.id).catch(err => {
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

    // جلب جميع المحاولات المكتملة
    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        quizId,
        status: 'SUBMITTED',
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
          },
        },
      },
      orderBy: {
        percentage: 'desc',
      },
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
      traineesWhoDidNotTakeQuiz,
    };
  }

  /**
   * تحديث اختبار
   */
  async update(id: number, updateQuizDto: UpdateQuizDto) {
    const { questions, ...quizData } = updateQuizDto;

    // التحقق من وجود الاختبار
    const existingQuiz = await this.prisma.quiz.findUnique({
      where: { id },
    });

    if (!existingQuiz) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    // التحقق من صحة التواريخ إذا تم تحديثها
    if (quizData.startDate || quizData.endDate) {
      const startDate = quizData.startDate
        ? new Date(quizData.startDate)
        : existingQuiz.startDate;
      const endDate = quizData.endDate
        ? new Date(quizData.endDate)
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
      updateData.startDate = new Date(quizData.startDate);
    }

    if (quizData.endDate) {
      updateData.endDate = new Date(quizData.endDate);
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

    // ✅ إذا تغيرت حالة النشر أو التفعيل → إعادة حساب درجات كل المتدربين
    const publishChanged = quizData.isPublished !== undefined && quizData.isPublished !== existingQuiz.isPublished;
    const activeChanged = quizData.isActive !== undefined && quizData.isActive !== existingQuiz.isActive;
    
    if (publishChanged || activeChanged) {
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

    // الحصول على الاختبار
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
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

    // التحقق من التوقيت
    const now = new Date();
    if (now < quiz.startDate) {
      throw new ForbiddenException('الاختبار لم يبدأ بعد');
    }

    if (now > quiz.endDate) {
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

    // هل يوجد اختبار مفتوح حالياً؟
    let currentAttempt = await this.prisma.quizAttempt.findFirst({
      where: {
        quizId,
        traineeId,
        status: 'IN_PROGRESS',
      },
    });

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
        quiz: true,
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

      if (!content || !content.quizzesMarks || content.quizzesMarks === 0) {
        return;
      }

      // الحصول على جميع الاختبارات المنشورة لهذه المادة
      const totalQuizzes = await this.prisma.quiz.count({
        where: {
          trainingContentId: contentId,
          isPublished: true,
          isActive: true,
        },
      });

      if (totalQuizzes === 0) {
        // لا يوجد اختبارات منشورة → تصفير درجة الاختبارات
        const existingGrade = await this.prisma.traineeGrades.findUnique({
          where: {
            traineeId_trainingContentId_classroomId: {
              traineeId,
              trainingContentId: contentId,
              classroomId: content.classroomId,
            },
          },
        });
        if (existingGrade && existingGrade.quizzesMarks > 0) {
          const newTotal =
            (existingGrade.yearWorkMarks || 0) +
            (existingGrade.practicalMarks || 0) +
            (existingGrade.writtenMarks || 0) +
            (existingGrade.attendanceMarks || 0) +
            0 + // quizzesMarks = 0
            (existingGrade.finalExamMarks || 0);
          await this.prisma.traineeGrades.update({
            where: {
              traineeId_trainingContentId_classroomId: {
                traineeId,
                trainingContentId: contentId,
                classroomId: content.classroomId,
              },
            },
            data: {
              quizzesMarks: 0,
              totalMarks: newTotal,
            },
          });
        }
        return;
      }

      // حساب درجة كل اختبار (توزيع متساوي)
      const marksPerQuiz = content.quizzesMarks / totalQuizzes;

      // الحصول على أفضل محاولة للمتدرب في كل اختبار
      const quizzes = await this.prisma.quiz.findMany({
        where: {
          trainingContentId: contentId,
          isPublished: true,
          isActive: true,
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
    } catch (error) {
      console.error('Error updating quiz grades:', error);
    }
  }

  /**
   * الحصول على الاختبارات المتاحة للمتدرب
   */
  async getAvailableQuizzes(traineeId: number) {
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
            classroom: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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

    // إضافة معلومات عن حالة الاختبار لكل متدرب
    const now = new Date();
    const quizzesWithAttempts = await Promise.all(
      quizzes.map(async (quiz) => {
        // هل أنهى الاختبار؟
        const completedAttempt = await this.prisma.quizAttempt.findFirst({
          where: {
            quizId: quiz.id,
            traineeId,
            status: 'SUBMITTED',
          },
        });

        // هل يوجد اختبار مفتوح حالياً؟
        const inProgressAttempt = await this.prisma.quizAttempt.findFirst({
          where: {
            quizId: quiz.id,
            traineeId,
            status: 'IN_PROGRESS',
          },
        });

        const status = now < quiz.startDate
          ? 'upcoming'
          : now > quiz.endDate
          ? 'ended'
          : completedAttempt
          ? 'completed'
          : 'available';

        const canAttempt = status === 'available';

        return {
          ...quiz,
          isCompleted: !!completedAttempt,
          hasInProgress: !!inProgressAttempt,
          result: completedAttempt ? {
            id: completedAttempt.id,
            score: completedAttempt.score,
            percentage: completedAttempt.percentage,
            passed: completedAttempt.passed,
            submittedAt: completedAttempt.submittedAt,
          } : null,
          status,
          canAttempt,
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

