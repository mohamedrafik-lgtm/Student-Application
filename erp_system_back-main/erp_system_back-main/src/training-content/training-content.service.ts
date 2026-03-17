import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainingContentDto } from './dto/create-training-content.dto';
import { UpdateTrainingContentDto } from './dto/update-training-content.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { toJsonValue } from '../lib/utils';

@Injectable()
export class TrainingContentService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createTrainingContentDto: CreateTrainingContentDto, userId: string) {
    const { attendanceRecorderIds, ...contentData } = createTrainingContentDto;

    return this.prisma.$transaction(async (tx) => {
      // إنشاء المحتوى التدريبي
      const trainingContent = await tx.trainingContent.create({
        data: {
          ...contentData,
          contentType: contentData.contentType || 'UNSPECIFIED',
        },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          program: true,
          classroom: true,
          theoryAttendanceRecorder: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          practicalAttendanceRecorder: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // إضافة مسؤولي الحضور الجدد إذا تم تحديدهم
      if (attendanceRecorderIds && attendanceRecorderIds.length > 0) {
        await tx.trainingContentAttendance.createMany({
          data: attendanceRecorderIds.map(recorderId => ({
            trainingContentId: trainingContent.id,
            userId: recorderId,
            assignedBy: userId,
          })),
        });
      }

      await this.auditService.log({
        action: AuditAction.CREATE,
        entity: 'TrainingContent',
        entityId: String(trainingContent.id),
        userId,
        details: { message: `Created training content: ${trainingContent.name}` },
      });

      return trainingContent;
    });
  }

  // دالة لإنشاء كود فريد للمقرر
  async generateUniqueCode(): Promise<{ code: string }> {
    let isUnique = false;
    let code = '';
    let attempts = 0;
    const MAX_ATTEMPTS = 100; // ✅ حد أقصى للمحاولات لمنع infinite loop
    
    // محاولة إنشاء كود فريد حتى نجد واحدًا غير مستخدم
    while (!isUnique && attempts < MAX_ATTEMPTS) {
      attempts++;
      
      // إنشاء كود عشوائي مكون من حرفين وثلاثة أرقام
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const prefix = letters.charAt(Math.floor(Math.random() * letters.length)) + 
                     letters.charAt(Math.floor(Math.random() * letters.length));
      const numbers = Math.floor(100 + Math.random() * 900); // رقم من 100 إلى 999
      
      code = `${prefix}${numbers}`;
      
      // التحقق من أن الكود غير مستخدم بالفعل
      const existingContent = await this.prisma.trainingContent.findUnique({
        where: { code },
      });
      
      isUnique = !existingContent;
    }
    
    // ✅ إذا فشلت جميع المحاولات، استخدم timestamp كـ fallback
    if (!isUnique) {
      code = `TC${Date.now().toString().slice(-6)}`;
      console.warn(`⚠️ Failed to generate unique code after ${MAX_ATTEMPTS} attempts, using timestamp-based code: ${code}`);
    }
    
    return { code };
  }

  async findByInstructor(instructorId: string) {
    return await this.prisma.trainingContent.findMany({
      where: {
        instructorId: instructorId,
      },
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            classNumber: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findAll(includeQuestionCount = false, classroomId?: number, programId?: number) {
    // بناء شرط البحث
    let whereCondition: any = {};
    
    // فلترة حسب programId (أولوية)
    if (programId) {
      whereCondition.programId = programId;
    }
    // أو حسب classroomId - فلترة مباشرة حسب الفصل الدراسي
    else if (classroomId) {
      whereCondition.classroomId = classroomId;
    }

    return await this.prisma.trainingContent.findMany({
      where: Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        program: true,
        classroom: true,
        theoryAttendanceRecorder: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        practicalAttendanceRecorder: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendanceRecorders: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            ...(includeQuestionCount ? { questions: true } : {}),
            scheduleSlots: true,
          },
        },
      },
    });
  }

  async findOne(id: number, includeQuestionCount = false) {
    const trainingContent = await this.prisma.trainingContent.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        program: true,
        classroom: true,
        theoryAttendanceRecorder: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        practicalAttendanceRecorder: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendanceRecorders: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            ...(includeQuestionCount ? { questions: true } : {}),
            scheduleSlots: true,
          },
        },
      },
    });

    if (!trainingContent) {
      throw new NotFoundException(`Training content with ID ${id} not found`);
    }

    return trainingContent;
  }

  async update(id: number, updateTrainingContentDto: UpdateTrainingContentDto, userId: string) {
    const before = await this.findOne(id);
    const { attendanceRecorderIds, ...contentData } = updateTrainingContentDto;

    return this.prisma.$transaction(async (tx) => {
      // تحديث المحتوى التدريبي
      const updatedContent = await tx.trainingContent.update({
        where: { id },
        data: contentData,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          program: true,
          classroom: true,
          theoryAttendanceRecorder: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          practicalAttendanceRecorder: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // تحديث مسؤولي الحضور إذا تم تحديدهم
      if (attendanceRecorderIds !== undefined) {
        // حذف المسؤولين الحاليين
        await tx.trainingContentAttendance.deleteMany({
          where: { trainingContentId: id },
        });

        // إضافة المسؤولين الجدد
        if (attendanceRecorderIds.length > 0) {
          await tx.trainingContentAttendance.createMany({
            data: attendanceRecorderIds.map(recorderId => ({
              trainingContentId: id,
              userId: recorderId,
              assignedBy: userId,
            })),
          });
        }
      }

      await this.auditService.log({
        action: AuditAction.UPDATE,
        entity: 'TrainingContent',
        entityId: String(id),
        userId,
        details: toJsonValue({ before, after: updatedContent }),
      });

      return updatedContent;
    });
  }

  async remove(id: number, userId: string) {
    const trainingContent = await this.findOne(id);

    await this.prisma.trainingContent.delete({
      where: { id },
    });

    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'TrainingContent',
      entityId: String(id),
      userId,
      details: toJsonValue({ 
        message: `Deleted training content: ${trainingContent.name}`, 
        deletedData: trainingContent 
      }),
    });

    return { message: 'Training content deleted successfully' };
  }

  // جلب المحاضرات للمادة التدريبية (placeholder - سيتم تطويره لاحقاً)
  async findLectures(trainingContentId: number) {
    // في المستقبل، سيتم جلب المحاضرات من جدول خاص
    // حالياً نرجع مصفوفة فارغة
    return [];
  }

  // جلب الأسئلة للمادة التدريبية (placeholder - سيتم تطويره لاحقاً)
  async findQuestions(trainingContentId: number) {
    // في المستقبل، سيتم جلب الأسئلة من جدول بنك الأسئلة
    // حالياً نرجع مصفوفة فارغة
    return [];
  }

  // جلب المتدربين مع pagination للمادة التدريبية
  async findTraineesWithPagination(
    trainingContentId: number,
    page: number = 1,
    limit: number = 20,
    search?: string
  ) {
    // التحقق من وجود المادة التدريبية وجلب معلومات البرنامج
    const trainingContent = await this.prisma.trainingContent.findUnique({
      where: { id: trainingContentId },
      select: {
        id: true,
        classroomId: true,
        programId: true,
      },
    });

    if (!trainingContent) {
      throw new NotFoundException('المادة التدريبية غير موجودة');
    }

    if (!trainingContent.programId) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const skip = (page - 1) * limit;

    // جلب جميع المتدربين في البرنامج التدريبي (بغض النظر عن سجلات الدرجات)
    const where: any = {
      programId: trainingContent.programId,
    };

    if (search) {
      where.OR = [
        { nameAr: { contains: search } },
        { nameEn: { contains: search } },
        { nationalId: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // جلب العدد الإجمالي
    const total = await this.prisma.trainee.count({ where });

    // جلب البيانات مع pagination
    const trainees = await this.prisma.trainee.findMany({
      where,
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        nationalId: true,
        email: true,
        phone: true,
        photoUrl: true,
      },
      orderBy: {
        nameAr: 'asc',
      },
      skip,
      take: limit,
    });

    return {
      data: trainees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  // جلب سجلات الحضور للمادة التدريبية
  async findAttendanceByContent(
    trainingContentId: number,
    page: number = 1,
    limit: number = 20,
    search?: string
  ) {
    // التحقق من وجود المادة التدريبية وجلب معلومات البرنامج
    const trainingContent = await this.prisma.trainingContent.findUnique({
      where: { id: trainingContentId },
      select: {
        id: true,
        name: true,
        code: true,
        classroomId: true,
        programId: true,
      },
    });

    if (!trainingContent) {
      throw new NotFoundException('المادة التدريبية غير موجودة');
    }

    if (!trainingContent.programId) {
      return {
        content: trainingContent,
        sessions: [],
        trainees: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const skip = (page - 1) * limit;

    // جلب جميع المتدربين في البرنامج التدريبي (بغض النظر عن سجلات الحضور)
    const where: any = {
      programId: trainingContent.programId,
    };

    if (search) {
      where.OR = [
        { nameAr: { contains: search } },
        { nameEn: { contains: search } },
        { nationalId: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Get total count
    const total = await this.prisma.trainee.count({ where });

    // جلب المتدربين مع pagination
    const trainees = await this.prisma.trainee.findMany({
      where,
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        nationalId: true,
        email: true,
        phone: true,
        photoUrl: true,
      },
      orderBy: {
        nameAr: 'asc',
      },
      skip,
      take: limit,
    });

    // جلب جميع الجلسات للمادة التدريبية
    const sessions = await this.prisma.session.findMany({
      where: {
        contentId: trainingContentId,
      },
      include: {
        attendanceRecords: {
          select: {
            id: true,
            traineeId: true,
            status: true,
            notes: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // تجهيز البيانات مع إحصائيات الحضور لكل متدرب
    const traineesWithAttendance = trainees.map(trainee => {
      // جمع سجلات الحضور للمتدرب من جميع الجلسات
      const attendanceRecords: any[] = [];
      sessions.forEach(session => {
        const record = session.attendanceRecords.find(r => r.traineeId === trainee.id);
        attendanceRecords.push({
          sessionId: session.id,
          sessionTitle: session.title,
          sessionType: session.type,
          sessionDate: session.date,
          sessionChapter: session.chapter,
          status: record?.status || 'NOT_RECORDED',
          notes: record?.notes,
          recordedAt: record?.createdAt,
          recordedBy: record?.createdBy,
        });
      });

      // حساب الإحصائيات
      const stats = {
        total: sessions.length,
        present: attendanceRecords.filter(r => r.status === 'PRESENT').length,
        absent: attendanceRecords.filter(r => r.status === 'ABSENT').length,
        late: attendanceRecords.filter(r => r.status === 'LATE').length,
        excused: attendanceRecords.filter(r => r.status === 'EXCUSED').length,
        notRecorded: attendanceRecords.filter(r => r.status === 'NOT_RECORDED').length,
      };

      // حساب نسبة الحضور
      const attendanceRate = stats.total > 0
        ? ((stats.present + stats.late) / stats.total) * 100
        : 0;

      return {
        ...trainee,
        attendanceRecords,
        stats,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
      };
    });

    return {
      content: trainingContent,
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title,
        type: s.type,
        date: s.date,
        chapter: s.chapter,
      })),
      trainees: traineesWithAttendance,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }
} 