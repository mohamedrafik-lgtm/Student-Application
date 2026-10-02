import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeAppealDto } from './dto/create-grade-appeal.dto';
import { ReviewGradeAppealDto } from './dto/review-grade-appeal.dto';
import { TransactionType } from '@prisma/client';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';

@Injectable()
export class GradeAppealsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => UnifiedWhatsAppService))
    private whatsappService: UnifiedWhatsAppService,
  ) {}

  /**
   * التحقق من حالة قبول التظلمات
   */
  async isAppealsOpen(): Promise<boolean> {
    const settings = await this.prisma.systemSettings.findFirst();
    return settings?.acceptGradeAppeals ?? true;
  }

  /**
   * تبديل حالة قبول التظلمات
   */
  async toggleAppealsStatus(accept: boolean) {
    const settings = await this.prisma.systemSettings.findFirst();
    if (!settings) throw new NotFoundException('لم يتم العثور على إعدادات النظام');
    return this.prisma.systemSettings.update({
      where: { id: settings.id },
      data: { acceptGradeAppeals: accept },
    });
  }

  /**
   * جلب حالة التظلمات
   */
  async getAppealsSettings() {
    const settings = await this.prisma.systemSettings.findFirst();
    return { acceptGradeAppeals: settings?.acceptGradeAppeals ?? true };
  }

  /**
   * إنشاء تظلم جديد من المتدرب
   */
  async create(traineeId: number, createDto: CreateGradeAppealDto) {
    // التحقق من أن التظلمات مفتوحة
    const isOpen = await this.isAppealsOpen();
    if (!isOpen) {
      throw new ForbiddenException('عذراً، تقديم التظلمات مغلق حالياً. يرجى التواصل مع الإدارة.');
    }

    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // التحقق من عدم وجود تظلم سابق بنفس المواد (يمكن تقديم تظلم للمادة مرة واحدة فقط)
    const existingAppeals = await this.prisma.gradeAppeal.findMany({
      where: {
        traineeId,
      },
      include: { subjects: true },
    });

    for (const appeal of existingAppeals) {
      const existingContentIds = appeal.subjects.map(s => s.contentId);
      const duplicates = createDto.subjects.filter(s => existingContentIds.includes(s.contentId));
      if (duplicates.length > 0) {
        throw new BadRequestException('لا يمكن تقديم تظلم لمادة تم التظلم عليها مسبقاً');
      }
    }

    return this.prisma.gradeAppeal.create({
      data: {
        traineeId,
        traineeNotes: createDto.traineeNotes,
        status: 'PENDING',
        subjects: {
          create: createDto.subjects.map(subject => ({
            contentId: subject.contentId,
            currentScore: subject.currentScore,
            maxScore: subject.maxScore,
            percentage: subject.percentage,
          })),
        },
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
          },
        },
        subjects: {
          include: {
            content: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * جلب تظلمات المتدرب
   */
  async findMyAppeals(traineeId: number) {
    return this.prisma.gradeAppeal.findMany({
      where: { traineeId },
      include: {
        subjects: {
          include: {
            content: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * إلغاء تظلم من قبل المتدرب (فقط خلال 6 ساعات من التقديم وإذا لم تتم مراجعة أي مادة)
   */
  async cancelAppeal(appealId: string, traineeId: number) {
    const appeal = await this.prisma.gradeAppeal.findUnique({
      where: { id: appealId },
      include: { subjects: true },
    });

    if (!appeal) {
      throw new NotFoundException('التظلم غير موجود');
    }

    if (appeal.traineeId !== traineeId) {
      throw new BadRequestException('لا يمكنك إلغاء تظلم لا يخصك');
    }

    // التحقق من أن جميع المواد لا تزال قيد المراجعة
    const hasReviewedSubject = appeal.subjects.some(s => s.status !== 'PENDING');
    if (hasReviewedSubject) {
      throw new BadRequestException('لا يمكن إلغاء التظلم بعد مراجعة إحدى المواد');
    }

    // التحقق من أن التظلم خلال 6 ساعات من التقديم
    const sixHoursMs = 6 * 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(appeal.createdAt).getTime();
    if (elapsed > sixHoursMs) {
      throw new BadRequestException('انتهت مهلة إلغاء التظلم (6 ساعات من تاريخ التقديم)');
    }

    await this.prisma.gradeAppeal.delete({ where: { id: appealId } });
    return { message: 'تم إلغاء التظلم بنجاح' };
  }

  /**
   * جلب جميع التظلمات (للإدارة)
   */
  async findAll(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    allowedProgramIds?: number[];
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.trainee = {
        OR: [
          { nameAr: { contains: filters.search } },
          { nationalId: { contains: filters.search } },
          { phone: { contains: filters.search } },
        ],
      };
    }

    // فلتر البرامج المسموحة
    if (filters?.allowedProgramIds) {
      if (where.trainee) {
        where.trainee = { AND: [where.trainee, { programId: { in: filters.allowedProgramIds } }] };
      } else {
        where.trainee = { programId: { in: filters.allowedProgramIds } };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.gradeAppeal.findMany({
        where,
        skip,
        take: limit,
        include: {
          trainee: {
            select: {
              id: true,
              nameAr: true,
              nationalId: true,
              phone: true,
              photoUrl: true,
              program: {
                select: {
                  nameAr: true,
                },
              },
            },
          },
          subjects: {
            include: {
              content: {
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
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.gradeAppeal.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * إحصائيات التظلمات
   */
  async getStats(allowedProgramIds?: number[]) {
    const baseWhere = allowedProgramIds ? { trainee: { programId: { in: allowedProgramIds } } } : {};
    
    const [total, pending, accepted, rejected] = await Promise.all([
      this.prisma.gradeAppeal.count({ where: baseWhere }),
      this.prisma.gradeAppeal.count({ where: { ...baseWhere, status: 'PENDING' } }),
      this.prisma.gradeAppeal.count({ where: { ...baseWhere, status: 'ACCEPTED' } }),
      this.prisma.gradeAppeal.count({ where: { ...baseWhere, status: 'REJECTED' } }),
    ]);

    return { total, pending, accepted, rejected };
  }

  /**
   * جلب تفاصيل تظلم
   */
  async findOne(id: string) {
    const item = await this.prisma.gradeAppeal.findUnique({
      where: { id },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            phone: true,
            program: {
              select: {
                nameAr: true,
              },
            },
          },
        },
        subjects: {
          include: {
            content: {
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
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('التظلم غير موجود');
    }

    return item;
  }

  /**
   * جلب بيانات المراجعة التفصيلية للتظلم
   * يشمل: بيانات التظلم + الاختبارات الورقية لكل مادة + درجات المتدرب
   */
  async getReviewData(id: string) {
    const appeal = await this.findOne(id);

    const traineeId = appeal.traineeId;
    const contentIds = appeal.subjects.map(s => s.contentId);

    // جلب جميع الاختبارات الورقية للمواد المتظلم منها مع أوراق إجابة المتدرب
    const paperExams = await this.prisma.paperExam.findMany({
      where: {
        trainingContentId: { in: contentIds },
      },
      select: {
        id: true,
        title: true,
        gradeType: true,
        totalMarks: true,
        passingScore: true,
        status: true,
        examDate: true,
        trainingContentId: true,
        answerSheets: {
          where: { traineeId },
          select: {
            id: true,
            score: true,
            totalPoints: true,
            percentage: true,
            passed: true,
            status: true,
            gradedAt: true,
          },
        },
      },
      orderBy: { examDate: 'desc' },
    });

    // جلب درجات المتدرب في هذه المواد
    const traineeGrades = await this.prisma.traineeGrades.findMany({
      where: {
        traineeId,
        trainingContentId: { in: contentIds },
      },
      select: {
        trainingContentId: true,
        yearWorkMarks: true,
        practicalMarks: true,
        writtenMarks: true,
        attendanceMarks: true,
        quizzesMarks: true,
        finalExamMarks: true,
        totalMarks: true,
      },
    });

    // تجميع الاختبارات والدرجات حسب المادة
    const subjectsWithExams = appeal.subjects.map((subject: any) => {
      const exams = paperExams.filter(e => e.trainingContentId === subject.contentId);
      const grades = traineeGrades.find(g => g.trainingContentId === subject.contentId);
      return {
        ...subject,
        paperExams: exams,
        traineeGrades: grades || null,
      };
    });

    return {
      ...appeal,
      subjects: subjectsWithExams,
    };
  }

  /**
   * إعادة مراجعة (رفض جميع المواد المعلقة مع إرجاع الدرجات)
   */
  async bulkRejectAllSubjects(appealId: string, userId: string) {
    const appeal = await this.prisma.gradeAppeal.findUnique({
      where: { id: appealId },
      include: {
        subjects: {
          include: {
            content: { select: { id: true, name: true, code: true } },
          },
        },
        trainee: { select: { id: true, nameAr: true, programId: true } },
      },
    });

    if (!appeal) throw new NotFoundException('التظلم غير موجود');

    const pendingSubjects = appeal.subjects.filter(s => s.status === 'PENDING');

    if (pendingSubjects.length === 0) {
      throw new BadRequestException('لا يوجد مواد قيد المراجعة');
    }

    // رفض جميع المواد المعلقة
    for (const subject of pendingSubjects) {
      await this.reviewSubject(subject.id, 'REJECTED', 'تم إعادة التصحيح - لا يوجد درجات إضافية مستحقة', userId);
    }

    return { success: true, rejectedCount: pendingSubjects.length };
  }

  /**
   * حفظ حالة إعادة المراجعة لجميع مواد التظلم
   */
  async markSubjectsReviewed(appealId: string, userId: string) {
    const appeal = await this.prisma.gradeAppeal.findUnique({
      where: { id: appealId },
      include: { subjects: true },
    });

    if (!appeal) throw new NotFoundException('التظلم غير موجود');

    // تحديث جميع المواد بتاريخ ومسؤول آخر مراجعة
    await this.prisma.gradeAppealSubject.updateMany({
      where: { appealId },
      data: {
        lastReviewedAt: new Date(),
        lastReviewedBy: userId,
        lastReviewNote: 'تم إعادة التصحيح - لا يوجد درجات إضافية مستحقة',
      },
    });

    return { success: true, reviewedCount: appeal.subjects.length };
  }

  /**
   * مراجعة مادة واحدة في التظلم (قبول/رفض)
   * في حالة الرفض يتم تطبيق رسوم التظلم لهذه المادة فقط
   * يتم تحديث حالة التظلم الأم تلقائياً عند مراجعة جميع المواد
   */
  async reviewSubject(subjectId: string, status: 'ACCEPTED' | 'REJECTED', adminResponse: string | undefined, userId: string) {
    // جلب المادة مع بيانات التظلم الأم
    const subject = await this.prisma.gradeAppealSubject.findUnique({
      where: { id: subjectId },
      include: {
        appeal: {
          include: {
            trainee: {
              select: { id: true, nameAr: true, phone: true, programId: true, program: { select: { nameAr: true } } },
            },
            subjects: true,
          },
        },
        content: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('المادة غير موجودة في التظلم');
    }

    if (subject.status !== 'PENDING') {
      throw new BadRequestException('تمت مراجعة هذه المادة بالفعل');
    }

    // تحديث حالة المادة
    await this.prisma.gradeAppealSubject.update({
      where: { id: subjectId },
      data: { status },
    });

    // في حالة الرفض → تطبيق رسوم التظلم لهذه المادة فقط
    if (status === 'REJECTED') {
      await this.applyAppealFees(
        subject.appeal.trainee.id,
        subject.appeal.trainee.programId,
        1, // مادة واحدة
        subject.appeal.trainee.nameAr,
        userId,
        subject.content.name,
      );
    }

    // التحقق من مراجعة جميع المواد → تحديث حالة التظلم الأم
    const allSubjects = await this.prisma.gradeAppealSubject.findMany({
      where: { appealId: subject.appealId },
    });

    const allReviewed = allSubjects.every(s => s.id === subjectId ? true : s.status !== 'PENDING');

    if (allReviewed) {
      // تحديد حالة التظلم الأم: إذا كانت كل المواد مرفوضة → مرفوض، وإلا → مقبول جزئياً (نعتبره مقبول)
      const updatedStatuses = allSubjects.map(s => s.id === subjectId ? status : s.status);
      const allRejected = updatedStatuses.every(s => s === 'REJECTED');
      const allAccepted = updatedStatuses.every(s => s === 'ACCEPTED');
      const parentStatus = allRejected ? 'REJECTED' : allAccepted ? 'ACCEPTED' : 'ACCEPTED';

      await this.prisma.gradeAppeal.update({
        where: { id: subject.appealId },
        data: {
          status: parentStatus,
          reviewedBy: userId,
          reviewedAt: new Date(),
          adminResponse: adminResponse || null,
        },
      });
    } else if (adminResponse) {
      // تحديث رد الإدارة حتى لو لم تنته المراجعة بالكامل
      await this.prisma.gradeAppeal.update({
        where: { id: subject.appealId },
        data: {
          adminResponse,
          reviewedBy: userId,
        },
      });
    }

    // إرسال رسالة واتساب للمتدرب
    this.sendAppealReviewWhatsApp(
      subject.appeal.trainee.nameAr,
      subject.appeal.trainee.phone,
      subject.appeal.trainee.program?.nameAr || 'غير محدد',
      subject.content.name,
      status,
    );

    // إرجاع التظلم محدثاً
    return this.findOne(subject.appealId);
  }

  /**
   * إرسال رسالة واتساب لنتيجة مراجعة التظلم
   */
  private sendAppealReviewWhatsApp(
    traineeName: string,
    phone: string | null,
    programName: string,
    subjectName: string,
    status: 'ACCEPTED' | 'REJECTED',
  ) {
    if (!phone) return;

    setImmediate(async () => {
      try {
        const isReady = await this.whatsappService.isClientReallyReady();
        if (!isReady) {
          console.log(`[Grade Appeal WhatsApp] ⚠️ WhatsApp not ready, skipping for ${traineeName}`);
          return;
        }

        const statusText = status === 'ACCEPTED' ? '✅ مقبول' : '❌ مرفوض';
        const now = new Date();
        const dateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        let message = `📋 *نتيجة التظلم على الدرجات*\n\n`;
        message += `👤 *المتدرب:* ${traineeName}\n`;
        message += `🎓 *البرنامج التدريبي:* ${programName}\n`;
        message += `📚 *المادة:* ${subjectName}\n`;
        message += `📊 *حالة التظلم:* ${statusText}\n`;

        if (status === 'REJECTED') {
          message += `\n💰 *تنبيه:* تم تحميلك رسوم إعادة تصحيح 50 جنيه لمادة "${subjectName}"\n`;
        }

        message += `\n📅 *التاريخ:* ${dateStr}\n`;
        message += `⏰ *الوقت:* ${timeStr}\n`;
        message += `\n✨ مع تمنياتنا لكم بالتوفيق والنجاح`;

        const success = await this.whatsappService.sendMessage(phone, message);
        console.log(`[Grade Appeal WhatsApp] ${success ? '✅' : '❌'} Appeal review message ${success ? 'sent' : 'failed'} for ${traineeName} - ${subjectName} - ${status}`);
      } catch (error) {
        console.error(`[Grade Appeal WhatsApp] Error for ${traineeName}:`, error.message);
      }
    });
  }

  /**
   * مراجعة تظلم كامل (قبول/رفض) — يتم تطبيقه على جميع المواد المعلقة
   */
  async review(id: string, reviewDto: ReviewGradeAppealDto, userId: string) {
    const appeal = await this.prisma.gradeAppeal.findUnique({
      where: { id },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            programId: true,
          },
        },
        subjects: {
          include: {
            content: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!appeal) {
      throw new NotFoundException('التظلم غير موجود');
    }

    // تحديث حالة جميع المواد المعلقة
    const pendingSubjects = appeal.subjects.filter(s => s.status === 'PENDING');
    if (pendingSubjects.length === 0) {
      throw new BadRequestException('تمت مراجعة جميع المواد بالفعل');
    }

    await this.prisma.gradeAppealSubject.updateMany({
      where: {
        appealId: id,
        status: 'PENDING',
      },
      data: { status: reviewDto.status },
    });

    // تحديث حالة التظلم الأم
    const updatedAppeal = await this.prisma.gradeAppeal.update({
      where: { id },
      data: {
        status: reviewDto.status as any,
        reviewedBy: userId,
        reviewedAt: new Date(),
        adminResponse: reviewDto.adminResponse,
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
          },
        },
        subjects: {
          include: {
            content: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            name: true,
          },
        },
      },
    });

    // في حالة الرفض → تطبيق رسوم التظلم تلقائياً
    if (reviewDto.status === 'REJECTED') {
      await this.applyAppealFees(appeal.trainee.id, appeal.trainee.programId, pendingSubjects.length, appeal.trainee.nameAr, userId);
    }

    return updatedAppeal;
  }

  /**
   * تطبيق رسوم التظلم على المتدرب عند الرفض
   */
  private async applyAppealFees(
    traineeId: number,
    programId: number,
    rejectedSubjectsCount: number,
    traineeName: string,
    userId: string,
    subjectName?: string,
  ) {
    // البحث عن إعدادات رسوم التظلم لهذا البرنامج
    const feeConfig = await this.prisma.gradeAppealFeeConfig.findUnique({
      where: { programId },
      include: {
        fee: {
          include: { safe: true },
        },
      },
    });

    if (!feeConfig) {
      console.log(`⚠️ لا يوجد إعدادات رسوم تظلم للبرنامج ${programId} - لن يتم تطبيق رسوم`);
      return;
    }

    const fee = feeConfig.fee;
    const totalAmount = fee.amount * rejectedSubjectsCount;

    try {
      await this.prisma.$transaction(async (prisma) => {
        // إنشاء معاملة مالية
        const description = subjectName
          ? `رسوم تظلم مرفوض - مادة ${subjectName} - ${fee.amount} جنيه - المتدرب ${traineeName}`
          : `رسوم تظلم مرفوض - ${rejectedSubjectsCount} مادة × ${fee.amount} جنيه - المتدرب ${traineeName}`;
        await prisma.transaction.create({
          data: {
            amount: totalAmount,
            type: TransactionType.FEE,
            description,
            sourceId: fee.safeId,
            traineeFeeId: fee.id,
            createdById: userId,
          },
        });

        // إنشاء سجل مدفوعات للمتدرب
        await prisma.traineePayment.create({
          data: {
            amount: totalAmount,
            feeId: fee.id,
            traineeId: traineeId,
            safeId: fee.safeId,
            status: 'PENDING',
            notes: `رسوم تظلم مرفوض (${rejectedSubjectsCount} مادة)`,
          },
        });

        // تحديث رصيد الخزينة (خصم)
        await prisma.safe.update({
          where: { id: fee.safeId },
          data: { balance: { decrement: totalAmount } },
        });
      });

      console.log(`✅ تم تطبيق رسوم تظلم ${totalAmount} جنيه على المتدرب ${traineeName}`);
    } catch (error) {
      console.error(`❌ فشل في تطبيق رسوم التظلم:`, error);
      // لا نرمي الخطأ حتى لا يمنع عملية الرفض
    }
  }

  /**
   * حذف تظلم
   */
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.gradeAppeal.delete({ where: { id } });
    return { message: 'تم حذف التظلم بنجاح' };
  }

  // ==========================================
  // إعدادات رسوم التظلمات
  // ==========================================

  /**
   * جلب جميع إعدادات رسوم التظلمات
   */
  async getFeeConfigs() {
    return this.prisma.gradeAppealFeeConfig.findMany({
      include: {
        program: {
          select: { id: true, nameAr: true },
        },
        fee: {
          select: { id: true, name: true, amount: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * جلب إعدادات رسوم تظلم لبرنامج معين
   */
  async getFeeConfigByProgram(programId: number) {
    return this.prisma.gradeAppealFeeConfig.findUnique({
      where: { programId },
      include: {
        program: {
          select: { id: true, nameAr: true },
        },
        fee: {
          select: { id: true, name: true, amount: true, type: true, safeId: true },
        },
      },
    });
  }

  /**
   * إنشاء أو تحديث إعدادات رسوم التظلم لبرنامج
   */
  async upsertFeeConfig(programId: number, feeId: number) {
    // التحقق من وجود البرنامج
    const program = await this.prisma.trainingProgram.findUnique({
      where: { id: programId },
    });
    if (!program) {
      throw new NotFoundException('البرنامج غير موجود');
    }

    // التحقق من وجود القيد المالي
    const fee = await this.prisma.traineeFee.findUnique({
      where: { id: feeId },
    });
    if (!fee) {
      throw new NotFoundException('القيد المالي غير موجود');
    }

    return this.prisma.gradeAppealFeeConfig.upsert({
      where: { programId },
      create: {
        programId,
        feeId,
      },
      update: {
        feeId,
      },
      include: {
        program: {
          select: { id: true, nameAr: true },
        },
        fee: {
          select: { id: true, name: true, amount: true, type: true },
        },
      },
    });
  }

  /**
   * حذف إعدادات رسوم التظلم لبرنامج
   */
  async deleteFeeConfig(programId: number) {
    const config = await this.prisma.gradeAppealFeeConfig.findUnique({
      where: { programId },
    });
    if (!config) {
      throw new NotFoundException('لا توجد إعدادات رسوم تظلم لهذا البرنامج');
    }
    await this.prisma.gradeAppealFeeConfig.delete({
      where: { programId },
    });
    return { message: 'تم حذف إعدادات رسوم التظلم بنجاح' };
  }

  /**
   * جلب جميع القيود المالية (لجميع البرامج) لعرضها في القائمة المنسدلة
   */
  async getAllFees() {
    return this.prisma.traineeFee.findMany({
      select: {
        id: true,
        name: true,
        amount: true,
        type: true,
        programId: true,
        program: {
          select: { id: true, nameAr: true },
        },
      },
      orderBy: [{ programId: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * جلب جميع البرامج التدريبية
   */
  async getAllPrograms() {
    return this.prisma.trainingProgram.findMany({
      select: {
        id: true,
        nameAr: true,
      },
      orderBy: { nameAr: 'asc' },
    });
  }
}
