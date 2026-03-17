import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkUpdateGradesDto } from './dto/bulk-update-grades.dto';
import { TraineeReleasedGradesDto } from './dto/trainee-grades-response.dto';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  // حساب المجموع الكلي
  private calculateTotalMarks(gradeData: any): number {
    const {
      yearWorkMarks = 0,
      practicalMarks = 0,
      writtenMarks = 0,
      attendanceMarks = 0,
      quizzesMarks = 0,
      finalExamMarks = 0,
    } = gradeData;

    const total =
      Number(yearWorkMarks) +
      Number(practicalMarks) +
      Number(writtenMarks) +
      Number(attendanceMarks) +
      Number(quizzesMarks) +
      Number(finalExamMarks);

    return Math.round(total * 100) / 100;
  }

  // إنشاء أو تحديث درجة متدرب
  async upsertGrade(createGradeDto: CreateGradeDto) {
    const { traineeId, trainingContentId, classroomId, ...gradeData } = createGradeDto;

    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
    });
    if (!trainee) {
      throw new NotFoundException(`المتدرب غير موجود`);
    }

    // التحقق من وجود المادة التدريبية
    const trainingContent = await this.prisma.trainingContent.findUnique({
      where: { id: trainingContentId },
      include: { classroom: true },
    });
    if (!trainingContent) {
      throw new NotFoundException(`المادة التدريبية غير موجودة`);
    }

    // التحقق من وجود الفصل الدراسي
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom) {
      throw new NotFoundException(`الفصل الدراسي غير موجود`);
    }

    // التحقق من أن المادة تابعة للفصل الدراسي
    if (trainingContent.classroomId !== classroomId) {
      throw new BadRequestException(`المادة التدريبية غير تابعة للفصل الدراسي المحدد`);
    }

    // حساب المجموع الكلي
    const totalMarks = this.calculateTotalMarks(gradeData);

    // التحقق من أن المجموع لا يتجاوز 100
    if (totalMarks > 100) {
      throw new BadRequestException(`مجموع الدرجات لا يمكن أن يتجاوز 100 (المجموع الحالي: ${totalMarks})`);
    }

    // إنشاء أو تحديث السجل
    return this.prisma.traineeGrades.upsert({
      where: {
        traineeId_trainingContentId_classroomId: {
          traineeId,
          trainingContentId,
          classroomId,
        },
      },
      update: {
        ...gradeData,
        totalMarks,
      },
      create: {
        traineeId,
        trainingContentId,
        classroomId,
        ...gradeData,
        totalMarks,
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            nationalId: true,
            photoUrl: true,
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
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // تحديث درجات بشكل جماعي
  async bulkUpdateGrades(bulkUpdateGradesDto: BulkUpdateGradesDto) {
    const { trainingContentId, classroomId, grades } = bulkUpdateGradesDto;

    // التحقق من وجود المادة التدريبية
    const trainingContent = await this.prisma.trainingContent.findUnique({
      where: { id: trainingContentId },
      include: { classroom: true },
    });
    if (!trainingContent) {
      throw new NotFoundException(`المادة التدريبية غير موجودة`);
    }

    // التحقق من أن المادة تابعة للفصل الدراسي
    if (trainingContent.classroomId !== classroomId) {
      throw new BadRequestException(`المادة التدريبية غير تابعة للفصل الدراسي المحدد`);
    }

    // تحديث الدرجات
    const results = await Promise.all(
      grades.map(async (gradeEntry) => {
        const totalMarks = this.calculateTotalMarks(gradeEntry);

        // التحقق من أن المجموع لا يتجاوز 100
        if (totalMarks > 100) {
          throw new BadRequestException(
            `مجموع الدرجات للمتدرب ${gradeEntry.traineeId} لا يمكن أن يتجاوز 100 (المجموع الحالي: ${totalMarks})`
          );
        }

        const { traineeId, ...gradeData } = gradeEntry;
        
        return this.prisma.traineeGrades.upsert({
          where: {
            traineeId_trainingContentId_classroomId: {
              traineeId,
              trainingContentId,
              classroomId,
            },
          },
          update: {
            ...gradeData,
            totalMarks,
          },
          create: {
            traineeId,
            trainingContentId,
            classroomId,
            ...gradeData,
            totalMarks,
          },
        });
      })
    );

    return {
      message: 'تم تحديث الدرجات بنجاح',
      count: results.length,
    };
  }

  // الحصول على درجات مادة تدريبية معينة
  async getGradesByContent(trainingContentId: number, classroomId: number) {
    // التحقق من وجود المادة التدريبية
    const trainingContent = await this.prisma.trainingContent.findUnique({
      where: { id: trainingContentId },
      include: {
        classroom: {
          include: {
            program: true,
          },
        },
      },
    });

    if (!trainingContent) {
      throw new NotFoundException(`المادة التدريبية غير موجودة`);
    }

    // الحصول على جميع المتدربين في الفصل الدراسي
    const trainees = await this.prisma.trainee.findMany({
      where: {
        programId: trainingContent.classroom.programId,
        // يمكن إضافة شرط للفصل الدراسي هنا إذا كان هناك علاقة مباشرة
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        nationalId: true,
        photoUrl: true,
      },
      orderBy: {
        nameAr: 'asc',
      },
    });

    // الحصول على الدرجات الموجودة
    const grades = await this.prisma.traineeGrades.findMany({
      where: {
        trainingContentId,
        classroomId,
      },
    });

    // دمج المتدربين مع درجاتهم
    const gradesMap = new Map(grades.map((g) => [g.traineeId, g]));

    const result = trainees.map((trainee) => {
      const grade = gradesMap.get(trainee.id);
      return {
        trainee,
        grade: grade || null,
      };
    });

    return {
      trainingContent: {
        id: trainingContent.id,
        name: trainingContent.name,
        code: trainingContent.code,
        maxMarks: {
          yearWorkMarks: trainingContent.yearWorkMarks,
          practicalMarks: trainingContent.practicalMarks,
          writtenMarks: trainingContent.writtenMarks,
          attendanceMarks: trainingContent.attendanceMarks,
          quizzesMarks: trainingContent.quizzesMarks,
          finalExamMarks: trainingContent.finalExamMarks,
          total:
            trainingContent.yearWorkMarks +
            trainingContent.practicalMarks +
            trainingContent.writtenMarks +
            trainingContent.attendanceMarks +
            trainingContent.quizzesMarks +
            trainingContent.finalExamMarks,
        },
      },
      classroom: {
        id: trainingContent.classroom.id,
        name: trainingContent.classroom.name,
      },
      program: {
        id: trainingContent.classroom.program.id,
        nameAr: trainingContent.classroom.program.nameAr,
      },
      data: result,
    };
  }

  // الحصول على قائمة المتدربين مع pagination
  async getTraineesForGrades(
    page: number = 1,
    limit: number = 20,
    search?: string,
    programId?: number,
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    // تصفية حسب البرنامج
    if (programId) {
      where.programId = programId;
    }
    
    // البحث بالاسم أو الرقم القومي
    if (search) {
      where.OR = [
        { nameAr: { contains: search } },
        { nameEn: { contains: search } },
        { nationalId: { contains: search } },
      ];
    }

    const [trainees, total] = await Promise.all([
      this.prisma.trainee.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          nationalId: true,
          photoUrl: true,
          program: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              _count: {
                select: {
                  trainingContents: true,
                },
              },
            },
          },
          _count: {
            select: {
              grades: true,
            },
          },
        },
        orderBy: {
          nameAr: 'asc',
        },
      }),
      this.prisma.trainee.count({ where }),
    ]);

    return {
      data: trainees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // الحصول على درجات متدرب معين مع تفاصيل كاملة
  async getTraineeGradesDetailed(traineeId: number) {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        nationalId: true,
        photoUrl: true,
        phone: true,
        email: true,
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
    });

    if (!trainee) {
      throw new NotFoundException(`المتدرب غير موجود`);
    }

    // الحصول على جميع المواد التدريبية في برنامج المتدرب
    const trainingContents = await this.prisma.trainingContent.findMany({
      where: {
        programId: trainee.program.id,
      },
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
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // الحصول على الدرجات الموجودة
    const grades = await this.prisma.traineeGrades.findMany({
      where: { traineeId },
    });

    // دمج المواد مع الدرجات
    const gradesMap = new Map(
      grades.map((g) => [`${g.trainingContentId}-${g.classroomId}`, g])
    );

    const contentGrades = trainingContents.map((content) => {
      const key = `${content.id}-${content.classroom.id}`;
      const grade = gradesMap.get(key);
      
      return {
        content: {
          id: content.id,
          name: content.name,
          code: content.code,
          maxMarks: {
            yearWorkMarks: content.yearWorkMarks,
            practicalMarks: content.practicalMarks,
            writtenMarks: content.writtenMarks,
            attendanceMarks: content.attendanceMarks,
            quizzesMarks: content.quizzesMarks,
            finalExamMarks: content.finalExamMarks,
            total:
              content.yearWorkMarks +
              content.practicalMarks +
              content.writtenMarks +
              content.attendanceMarks +
              content.quizzesMarks +
              content.finalExamMarks,
          },
          classroom: content.classroom,
        },
        grade: grade || null,
      };
    });

    return {
      trainee,
      contentGrades,
    };
  }

  // الحصول على درجات متدرب معين (النسخة القديمة - للتوافق)
  async getTraineeGrades(traineeId: number) {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        nationalId: true,
        photoUrl: true,
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
    });

    if (!trainee) {
      throw new NotFoundException(`المتدرب غير موجود`);
    }

    const grades = await this.prisma.traineeGrades.findMany({
      where: { traineeId },
      include: {
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
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      trainee,
      grades,
    };
  }

  // حذف درجة متدرب
  async deleteGrade(id: number) {
    const grade = await this.prisma.traineeGrades.findUnique({
      where: { id },
    });

    if (!grade) {
      throw new NotFoundException(`السجل غير موجود`);
    }

    await this.prisma.traineeGrades.delete({
      where: { id },
    });

    return { message: 'تم حذف السجل بنجاح' };
  }

  // الحصول على الأوائل حسب البرنامج والفصل الدراسي
  async getTopStudents(programId?: number, classroomId?: number, limit: number = 10) {
    const where: any = {};
    
    if (programId) {
      where.trainee = {
        programId,
      };
    }
    
    if (classroomId) {
      where.classroomId = classroomId;
    }

    // جلب جميع الدرجات
    const allGrades = await this.prisma.traineeGrades.findMany({
      where,
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            nationalId: true,
            photoUrl: true,
            program: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
              },
            },
          },
        },
        trainingContent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // تجميع الدرجات حسب المتدرب
    const traineeGradesMap = new Map<number, any>();

    allGrades.forEach((grade) => {
      const traineeId = grade.traineeId;
      
      if (!traineeGradesMap.has(traineeId)) {
        traineeGradesMap.set(traineeId, {
          trainee: grade.trainee,
          totalMarks: 0,
          maxMarks: 0,
          subjectsCount: 0,
          grades: [],
        });
      }

      const traineeData = traineeGradesMap.get(traineeId);
      // حساب المجموع من المكونات الفردية بدلاً من totalMarks المخزن في قاعدة البيانات
      // لضمان التطابق مع صفحة درجات المتدرب
      const calculatedTotal = 
        (Number(grade.yearWorkMarks) || 0) +
        (Number(grade.practicalMarks) || 0) +
        (Number(grade.writtenMarks) || 0) +
        (Number(grade.attendanceMarks) || 0) +
        (Number(grade.quizzesMarks) || 0) +
        (Number(grade.finalExamMarks) || 0);
      
      traineeData.totalMarks += calculatedTotal;
      traineeData.subjectsCount += 1;
      traineeData.grades.push({
        content: grade.trainingContent,
        classroom: grade.classroom,
        marks: Math.round(calculatedTotal * 100) / 100,
      });
    });

    // تحويل إلى مصفوفة وحساب المجموع الأقصى
    const traineesArray = await Promise.all(
      Array.from(traineeGradesMap.entries()).map(async ([traineeId, data]) => {
        // حساب المجموع الأقصى لهذا المتدرب
        const maxMarks = await this.calculateMaxMarksForTrainee(
          traineeId,
          programId,
          classroomId,
        );

        const percentage = maxMarks > 0 ? (data.totalMarks / maxMarks) * 100 : 0;

        return {
          trainee: data.trainee,
          totalMarks: Number(data.totalMarks.toFixed(2)),
          maxMarks,
          percentage: Number(percentage.toFixed(2)),
          subjectsCount: data.subjectsCount,
          grades: data.grades,
        };
      })
    );

    // ترتيب حسب المجموع الكلي
    traineesArray.sort((a, b) => b.totalMarks - a.totalMarks);

    // أخذ أول N متدرب
    const topStudents = traineesArray.slice(0, limit);

    return topStudents;
  }

  // حساب المجموع الأقصى لمتدرب معين
  private async calculateMaxMarksForTrainee(
    traineeId: number,
    programId?: number,
    classroomId?: number,
  ): Promise<number> {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: {
        programId: true,
      },
    });

    if (!trainee) return 0;

    const where: any = {
      programId: programId || trainee.programId,
    };

    if (classroomId) {
      where.classroomId = classroomId;
    }

    const trainingContents = await this.prisma.trainingContent.findMany({
      where,
      select: {
        yearWorkMarks: true,
        practicalMarks: true,
        writtenMarks: true,
        attendanceMarks: true,
        quizzesMarks: true,
        finalExamMarks: true,
      },
    });

    let totalMax = 0;
    trainingContents.forEach((content) => {
      totalMax +=
        (content.yearWorkMarks || 0) +
        (content.practicalMarks || 0) +
        (content.writtenMarks || 0) +
        (content.attendanceMarks || 0) +
        (content.quizzesMarks || 0) +
        (content.finalExamMarks || 0);
    });

    return totalMax;
  }

  // الحصول على الأوائل مجمعة حسب الفصول الدراسية
  async getTopStudentsByClassroom(programId?: number, limit: number = 5) {
    const where: any = {};
    
    if (programId) {
      where.program = {
        id: programId,
      };
    }

    // جلب جميع الفصول الدراسية
    const classrooms = await this.prisma.classroom.findMany({
      where,
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // جلب الأوائل لكل فصل
    const result = await Promise.all(
      classrooms.map(async (classroom) => {
        const topStudents = await this.getTopStudents(programId, classroom.id, limit);
        return {
          classroom,
          topStudents,
        };
      })
    );

    return result;
  }

  /**
   * جلب طلاب الدور الثاني - المتدربون الذين لديهم مواد أقل من 50%
   * مجمعة حسب الفصول الدراسية
   */
  async getSecondRoundStudentsByClassroom(programId?: number) {
    const classroomWhere: any = {};
    if (programId) {
      classroomWhere.program = { id: programId };
    }

    // جلب جميع الفصول الدراسية
    const classrooms = await this.prisma.classroom.findMany({
      where: classroomWhere,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const result = await Promise.all(
      classrooms.map(async (classroom) => {
        // جلب جميع الدرجات في هذا الفصل
        const gradeWhere: any = { classroomId: classroom.id };
        if (programId) {
          gradeWhere.trainee = { programId };
        }

        const allGrades = await this.prisma.traineeGrades.findMany({
          where: gradeWhere,
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

        // تجميع حسب المتدرب
        const traineeMap = new Map<number, any>();

        allGrades.forEach((grade) => {
          const content = grade.trainingContent;
          const maxMarks =
            (content.yearWorkMarks || 0) +
            (content.practicalMarks || 0) +
            (content.writtenMarks || 0) +
            (content.attendanceMarks || 0) +
            (content.quizzesMarks || 0) +
            (content.finalExamMarks || 0);

          // حساب المجموع من المكونات الفردية بدلاً من totalMarks المخزن
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
            if (!traineeMap.has(grade.traineeId)) {
              traineeMap.set(grade.traineeId, {
                trainee: grade.trainee,
                failedSubjects: [],
              });
            }

            traineeMap.get(grade.traineeId).failedSubjects.push({
              content: { id: content.id, name: content.name, code: content.code },
              totalMarks: Number(total.toFixed(2)),
              maxMarks,
              percentage: Number(percentage.toFixed(2)),
            });
          }
        });

        // تحويل إلى مصفوفة
        const students = Array.from(traineeMap.values()).sort((a, b) =>
          a.trainee.nameAr.localeCompare(b.trainee.nameAr, 'ar'),
        );

        return {
          classroom,
          students,
          totalStudents: students.length,
        };
      }),
    );

    // إرجاع فقط الفصول التي بها طلاب دور ثاني
    return result.filter((r) => r.totalStudents > 0);
  }

  /**
   * جلب الدرجات المعلنة فقط للمتدرب
   * مع التحقق من الشروط المالية
   */
  async getTraineeReleasedGrades(traineeId: number) {
    // جلب معلومات المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: {
        program: {
          include: {
            classrooms: {
              orderBy: { classNumber: 'asc' },
            },
            gradeReleaseSettings: {
              where: {
                isReleased: true,
              },
            },
          },
        },
        traineePayments: {
          include: {
            fee: true,
          },
        },
      },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    const classroomsWithGrades = [];

    for (const classroom of trainee.program.classrooms) {
      // البحث عن إعداد الإعلان لهذا الفصل
      const semester = classroom.classNumber % 2 === 1 ? 'FIRST' : 'SECOND';
      // استخدام نفس العام الدراسي المستخدم في الـ frontend
      const uniqueYear = `2024-2025-P${trainee.programId}-C${classroom.classNumber}`;
      
      const releaseSetting = trainee.program.gradeReleaseSettings.find(
        (s) => s.semester === semester && s.academicYear === uniqueYear
      );

      // إذا لم يتم الإعلان عن هذا الفصل، تجاهله
      if (!releaseSetting) continue;

      // التحقق من الشرط المالي
      let canView = true;
      let reason = '';

      if (releaseSetting.requirePayment && releaseSetting.linkedFeeType) {
        // البحث عن الدفعة المطلوبة
        const requiredPayment = trainee.traineePayments.find(
          (payment) => payment.fee.name === releaseSetting.linkedFeeType && payment.status === 'PAID'
        );

        if (!requiredPayment) {
          canView = false;
          reason = `يتطلب سداد ${releaseSetting.linkedFeeType} لعرض النتائج`;
        }
      }

      // جلب المحتوى التدريبي والدرجات لهذا الفصل
      const contents = await this.prisma.trainingContent.findMany({
        where: {
          programId: trainee.programId,
          classroomId: classroom.id,
        },
        include: {
          grades: {
            where: {
              traineeId: traineeId,
            },
          },
        },
        orderBy: {
          code: 'asc',
        },
      });

      const contentGrades = contents.map((content) => {
        const grade = content.grades[0];
        return {
          content: {
            id: content.id,
            name: content.name,
            code: content.code,
          },
          grade: grade
            ? {
                yearWorkMarks: grade.yearWorkMarks,
                practicalMarks: grade.practicalMarks,
                writtenMarks: grade.writtenMarks,
                attendanceMarks: grade.attendanceMarks,
                quizzesMarks: grade.quizzesMarks,
                finalExamMarks: grade.finalExamMarks,
                total: this.calculateTotalMarks(grade),
              }
            : null,
          maxMarks: {
            yearWorkMarks: content.yearWorkMarks,
            practicalMarks: content.practicalMarks,
            writtenMarks: content.writtenMarks,
            attendanceMarks: content.attendanceMarks,
            quizzesMarks: content.quizzesMarks,
            finalExamMarks: content.finalExamMarks,
            total:
              content.yearWorkMarks +
              content.practicalMarks +
              content.writtenMarks +
              content.attendanceMarks +
              content.quizzesMarks +
              content.finalExamMarks,
          },
        };
      });

      // حساب الإحصائيات
      let maxTotal = 0;
      let earnedTotal = 0;

      contentGrades.forEach((cg) => {
        maxTotal += cg.maxMarks.total;
        if (cg.grade) {
          earnedTotal += cg.grade.total;
        }
      });

      const percentage = maxTotal > 0 ? Math.round((earnedTotal / maxTotal) * 10000) / 100 : 0;

      classroomsWithGrades.push({
        classroom: {
          id: classroom.id,
          name: classroom.name,
          classNumber: classroom.classNumber,
          startDate: classroom.startDate,
          endDate: classroom.endDate,
        },
        releaseInfo: {
          releasedAt: releaseSetting.releasedAt,
          requirePayment: releaseSetting.requirePayment,
          linkedFeeType: releaseSetting.linkedFeeType,
          notes: releaseSetting.notes,
        },
        canView,
        reason,
        contents: canView ? contentGrades : [],
        totalStats: {
          maxTotal: Math.round(maxTotal * 100) / 100,
          earnedTotal: Math.round(earnedTotal * 100) / 100,
          percentage,
        },
      });
    }

    return {
      trainee: {
        id: trainee.id,
        nameAr: trainee.nameAr,
        nameEn: trainee.nameEn,
        nationalId: trainee.nationalId,
        program: {
          nameAr: trainee.program.nameAr,
          nameEn: trainee.program.nameEn,
        },
      },
      classrooms: classroomsWithGrades,
    };
  }

  /**
   * جلب درجات الرأفة المطبقة على متدرب معين
   * يبحث في حقل notes عن السجلات التي تحتوي على "درجة رأفة"
   */
  async getTraineeMercyGrades(traineeId: number) {
    const mercyGrades = await this.prisma.traineeGrades.findMany({
      where: {
        traineeId,
        notes: {
          contains: 'درجة رأفة',
        },
      },
      include: {
        trainingContent: {
          select: { id: true, name: true, code: true },
        },
        classroom: {
          select: { id: true, name: true, classNumber: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return mercyGrades.map((grade) => {
      // استخراج عدد الدرجات المضافة من الملاحظات
      // الصيغة: "تم إضافة X درجة رأفة (من أصل Y حد أقصى)"
      const match = grade.notes?.match(/تم إضافة ([\d.]+) درجة رأفة/);
      const addedPoints = match ? parseFloat(match[1]) : 0;

      // حساب المجموع من المكونات الفردية
      const totalAfter = 
        (Number(grade.yearWorkMarks) || 0) +
        (Number(grade.practicalMarks) || 0) +
        (Number(grade.writtenMarks) || 0) +
        (Number(grade.attendanceMarks) || 0) +
        (Number(grade.quizzesMarks) || 0) +
        (Number(grade.finalExamMarks) || 0);

      return {
        contentId: grade.trainingContent.id,
        contentName: grade.trainingContent.name,
        contentCode: grade.trainingContent.code,
        classroomId: grade.classroom.id,
        classroomName: grade.classroom.name,
        addedPoints,
        totalAfter: Math.round(totalAfter * 100) / 100,
        appliedAt: grade.updatedAt,
      };
    });
  }

  /**
   * درجات الرأفة - إضافة درجات للمتدربين الذين لديهم مواد أقل من نسبة معينة
   * يتم توزيع الدرجات على المكونات المفعلة بالتناسب
   */
  async applyMercyGrades(
    classroomId: number,
    bonusPoints: number,
    threshold: number = 50,
    contentIds?: number[],
    minThreshold: number = 0,
  ) {
    // 1. جلب الفصل الدراسي
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        program: { select: { id: true, nameAr: true } },
      },
    });

    if (!classroom) {
      throw new NotFoundException('الفصل الدراسي غير موجود');
    }

    if (bonusPoints <= 0 || bonusPoints > 20) {
      throw new BadRequestException('درجات الرأفة يجب أن تكون بين 1 و 20');
    }

    // 2. جلب المواد المختارة أو جميع المواد في الفصل
    const contentsWhere: any = { classroomId };
    if (contentIds && contentIds.length > 0) {
      contentsWhere.id = { in: contentIds };
    }
    const contents = await this.prisma.trainingContent.findMany({
      where: contentsWhere,
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
    });

    if (contents.length === 0) {
      throw new BadRequestException('لا توجد مواد في هذا الفصل الدراسي');
    }

    const targetContentIds = contents.map(c => c.id);

    // 3. جلب درجات المتدربين للمواد المستهدفة
    const allGrades = await this.prisma.traineeGrades.findMany({
      where: { classroomId, trainingContentId: { in: targetContentIds } },
      include: {
        trainee: {
          select: { id: true, nameAr: true, nationalId: true },
        },
        trainingContent: {
          select: {
            id: true,
            name: true,
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

    // 4. تجميع الدرجات حسب المتدرب
    const gradesByTrainee = new Map<number, typeof allGrades>();
    for (const grade of allGrades) {
      if (!gradesByTrainee.has(grade.traineeId)) {
        gradesByTrainee.set(grade.traineeId, []);
      }
      gradesByTrainee.get(grade.traineeId)!.push(grade);
    }

    let totalUpdated = 0;
    const details: Array<{
      traineeId: number;
      traineeName: string;
      contentName: string;
      oldTotal: number;
      newTotal: number;
      addedPoints: number;
      distribution: Record<string, { old: number; added: number; new: number; max: number }>;
    }> = [];
    const errors: string[] = [];

    // 5. لكل متدرب: فحص كل مادة
    for (const [traineeId, traineeGrades] of gradesByTrainee) {
      for (const grade of traineeGrades) {
        const content = grade.trainingContent;
        
        // حساب المكونات المفعلة (قيمتها > 0)
        const components = [
          { key: 'yearWorkMarks', max: content.yearWorkMarks, current: grade.yearWorkMarks || 0 },
          { key: 'practicalMarks', max: content.practicalMarks, current: grade.practicalMarks || 0 },
          { key: 'writtenMarks', max: content.writtenMarks, current: grade.writtenMarks || 0 },
          { key: 'attendanceMarks', max: content.attendanceMarks, current: grade.attendanceMarks || 0 },
          { key: 'quizzesMarks', max: content.quizzesMarks, current: grade.quizzesMarks || 0 },
          { key: 'finalExamMarks', max: content.finalExamMarks, current: grade.finalExamMarks || 0 },
        ];

        // حساب المجموع من المكونات الفردية بدلاً من totalMarks المخزن
        const totalMarks = components.reduce((sum, c) => sum + c.current, 0);

        // فقط المواد التي مجموعها >= الحد الأدنى و < الحد الأقصى
        if (totalMarks >= threshold || totalMarks < minThreshold) continue;

        // المكونات المفعلة فقط (max > 0) التي لم تصل للحد الأقصى
        const activeComponents = components.filter(c => c.max > 0 && c.current < c.max);
        
        if (activeComponents.length === 0) continue;

        // حساب المساحة المتبقية في كل مكون
        const totalRemainingSpace = activeComponents.reduce((sum, c) => sum + (c.max - c.current), 0);
        
        if (totalRemainingSpace <= 0) continue;

        // توزيع النقاط بالتناسب على المكونات المفعلة
        const pointsToDistribute = Math.min(bonusPoints, totalRemainingSpace);
        const distribution: Record<string, { old: number; added: number; new: number; max: number }> = {};
        const updateData: Record<string, number> = {};

        let distributedTotal = 0;
        for (let i = 0; i < activeComponents.length; i++) {
          const comp = activeComponents[i];
          const remaining = comp.max - comp.current;
          const proportion = remaining / totalRemainingSpace;
          
          let addForThis: number;
          if (i === activeComponents.length - 1) {
            // آخر مكون يأخذ الباقي (لتجنب أخطاء التقريب)
            addForThis = Math.min(pointsToDistribute - distributedTotal, remaining);
          } else {
            addForThis = Math.min(Math.round(pointsToDistribute * proportion * 100) / 100, remaining);
          }
          
          addForThis = Math.round(addForThis * 100) / 100;
          distributedTotal += addForThis;

          const newValue = Math.round((comp.current + addForThis) * 100) / 100;
          distribution[comp.key] = {
            old: comp.current,
            added: addForThis,
            new: newValue,
            max: comp.max,
          };
          updateData[comp.key] = newValue;
        }

        const newTotal = Math.round((totalMarks + distributedTotal) * 100) / 100;

        try {
          await this.prisma.traineeGrades.update({
            where: {
              traineeId_trainingContentId_classroomId: {
                traineeId,
                trainingContentId: content.id,
                classroomId,
              },
            },
            data: {
              ...updateData,
              totalMarks: newTotal,
              notes: `تم إضافة ${distributedTotal} درجة رأفة (من أصل ${bonusPoints} حد أقصى)`,
            },
          });

          totalUpdated++;
          details.push({
            traineeId,
            traineeName: grade.trainee.nameAr,
            contentName: content.name,
            oldTotal: totalMarks,
            newTotal,
            addedPoints: distributedTotal,
            distribution,
          });
        } catch (err: any) {
          errors.push(`خطأ للمتدرب ${grade.trainee.nameAr} في مادة ${content.name}: ${err.message}`);
        }
      }
    }

    return {
      classroomId,
      classroomName: classroom.name,
      programName: classroom.program.nameAr,
      bonusPoints,
      threshold,
      minThreshold,
      totalUpdated,
      totalErrors: errors.length,
      details: details.slice(0, 500),
      errors: errors.slice(0, 20),
    };
  }

  /**
   * معاينة درجات الرأفة بدون تطبيق
   */
  async previewMercyGrades(
    classroomId: number,
    bonusPoints: number,
    threshold: number = 50,
    contentIds?: number[],
    minThreshold: number = 0,
  ) {
    // 1. جلب الفصل الدراسي
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        program: { select: { id: true, nameAr: true } },
      },
    });

    if (!classroom) {
      throw new NotFoundException('الفصل الدراسي غير موجود');
    }

    // 2. جلب المواد المختارة أو جميع المواد في الفصل
    const contentsWhere: any = { classroomId };
    if (contentIds && contentIds.length > 0) {
      contentsWhere.id = { in: contentIds };
    }
    const contents = await this.prisma.trainingContent.findMany({
      where: contentsWhere,
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
    });

    if (contents.length === 0) {
      throw new BadRequestException('لا توجد مواد');
    }

    const targetContentIds = contents.map(c => c.id);

    // 3. جلب الدرجات للمواد المستهدفة
    const allGrades = await this.prisma.traineeGrades.findMany({
      where: { classroomId, trainingContentId: { in: targetContentIds } },
      include: {
        trainee: {
          select: { id: true, nameAr: true, nationalId: true },
        },
        trainingContent: {
          select: {
            id: true,
            name: true,
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

    // 4. تجميع حسب المتدرب
    const gradesByTrainee = new Map<number, typeof allGrades>();
    for (const grade of allGrades) {
      if (!gradesByTrainee.has(grade.traineeId)) {
        gradesByTrainee.set(grade.traineeId, []);
      }
      gradesByTrainee.get(grade.traineeId)!.push(grade);
    }

    const preview: Array<{
      traineeId: number;
      traineeName: string;
      nationalId: string;
      contentName: string;
      contentId: number;
      currentTotal: number;
      projectedTotal: number;
      addedPoints: number;
    }> = [];

    for (const [traineeId, traineeGrades] of gradesByTrainee) {
      for (const grade of traineeGrades) {
        const content = grade.trainingContent;
        const components = [
          { max: content.yearWorkMarks, current: grade.yearWorkMarks || 0 },
          { max: content.practicalMarks, current: grade.practicalMarks || 0 },
          { max: content.writtenMarks, current: grade.writtenMarks || 0 },
          { max: content.attendanceMarks, current: grade.attendanceMarks || 0 },
          { max: content.quizzesMarks, current: grade.quizzesMarks || 0 },
          { max: content.finalExamMarks, current: grade.finalExamMarks || 0 },
        ];

        // حساب المجموع من المكونات الفردية بدلاً من totalMarks المخزن
        const totalMarks = components.reduce((sum, c) => sum + c.current, 0);
        // فقط المواد التي مجموعها >= الحد الأدنى و < الحد الأقصى
        if (totalMarks >= threshold || totalMarks < minThreshold) continue;

        const activeComponents = components.filter(c => c.max > 0 && c.current < c.max);
        if (activeComponents.length === 0) continue;

        const totalRemainingSpace = activeComponents.reduce((sum, c) => sum + (c.max - c.current), 0);
        if (totalRemainingSpace <= 0) continue;

        const pointsToDistribute = Math.min(bonusPoints, totalRemainingSpace);
        const projectedTotal = Math.round((totalMarks + pointsToDistribute) * 100) / 100;

        preview.push({
          traineeId,
          traineeName: grade.trainee.nameAr,
          nationalId: grade.trainee.nationalId || '',
          contentName: content.name,
          contentId: content.id,
          currentTotal: totalMarks,
          projectedTotal,
          addedPoints: pointsToDistribute,
        });
      }
    }

    return {
      classroomId,
      classroomName: classroom.name,
      programName: classroom.program.nameAr,
      bonusPoints,
      threshold,
      minThreshold,
      totalAffected: preview.length,
      preview: preview.slice(0, 500),
    };
  }

  /**
   * معاينة تصفير مكون درجة معين
   * يعرض المتدربين الذين لديهم درجة ≤ الحد المحدد في المكون المختار
   */
  async previewResetComponent(
    contentIds: number[],
    component: string,
    threshold: number = 10,
  ) {
    const validComponents = [
      'yearWorkMarks', 'practicalMarks', 'writtenMarks',
      'attendanceMarks', 'quizzesMarks', 'finalExamMarks',
    ];
    if (!validComponents.includes(component)) {
      throw new BadRequestException('مكون الدرجة غير صالح');
    }

    if (contentIds.length === 0) {
      throw new BadRequestException('يرجى اختيار مادة واحدة على الأقل');
    }

    // جلب المواد المختارة
    const contents = await this.prisma.trainingContent.findMany({
      where: { id: { in: contentIds } },
      select: {
        id: true,
        name: true,
        code: true,
        classroomId: true,
        [component]: true,
        classroom: { select: { id: true, name: true } },
      },
    });

    if (contents.length === 0) {
      throw new NotFoundException('المواد التدريبية غير موجودة');
    }

    // جلب الدرجات التي فيها المكون المختار ≤ الحد وأكبر من 0
    const allGrades = await this.prisma.traineeGrades.findMany({
      where: {
        trainingContentId: { in: contentIds },
        [component]: { gt: 0, lte: threshold },
      },
      include: {
        trainee: {
          select: { id: true, nameAr: true, nationalId: true },
        },
        trainingContent: {
          select: { id: true, name: true, code: true },
        },
        classroom: {
          select: { id: true, name: true },
        },
      },
      orderBy: { trainee: { nameAr: 'asc' } },
    });

    const preview = allGrades.map((grade) => {
      const currentValue = Number((grade as any)[component]) || 0;
      const currentTotal =
        (Number(grade.yearWorkMarks) || 0) +
        (Number(grade.practicalMarks) || 0) +
        (Number(grade.writtenMarks) || 0) +
        (Number(grade.attendanceMarks) || 0) +
        (Number(grade.quizzesMarks) || 0) +
        (Number(grade.finalExamMarks) || 0);

      return {
        gradeId: grade.id,
        traineeId: grade.traineeId,
        traineeName: grade.trainee.nameAr,
        nationalId: grade.trainee.nationalId || '',
        contentId: grade.trainingContentId,
        contentName: grade.trainingContent.name,
        classroomName: grade.classroom.name,
        componentValue: currentValue,
        currentTotal: Math.round(currentTotal * 100) / 100,
        projectedTotal: Math.round((currentTotal - currentValue) * 100) / 100,
      };
    });

    return {
      component,
      threshold,
      totalAffected: preview.length,
      contents: contents.map(c => ({ id: c.id, name: c.name, code: c.code })),
      preview,
    };
  }

  /**
   * تصفير مكون درجة معين للمتدربين الذين درجتهم ≤ الحد المحدد
   */
  async applyResetComponent(
    contentIds: number[],
    component: string,
    threshold: number = 10,
  ) {
    const validComponents = [
      'yearWorkMarks', 'practicalMarks', 'writtenMarks',
      'attendanceMarks', 'quizzesMarks', 'finalExamMarks',
    ];
    if (!validComponents.includes(component)) {
      throw new BadRequestException('مكون الدرجة غير صالح');
    }

    if (contentIds.length === 0) {
      throw new BadRequestException('يرجى اختيار مادة واحدة على الأقل');
    }

    // جلب الدرجات المستهدفة
    const targetGrades = await this.prisma.traineeGrades.findMany({
      where: {
        trainingContentId: { in: contentIds },
        [component]: { gt: 0, lte: threshold },
      },
      include: {
        trainee: {
          select: { id: true, nameAr: true, nationalId: true },
        },
        trainingContent: {
          select: { id: true, name: true },
        },
      },
    });

    if (targetGrades.length === 0) {
      return {
        totalUpdated: 0,
        totalErrors: 0,
        details: [],
        errors: [],
      };
    }

    let totalUpdated = 0;
    const details: Array<{
      traineeId: number;
      traineeName: string;
      contentName: string;
      oldValue: number;
      oldTotal: number;
      newTotal: number;
    }> = [];
    const errors: string[] = [];

    for (const grade of targetGrades) {
      const oldValue = Number((grade as any)[component]) || 0;
      const oldTotal =
        (Number(grade.yearWorkMarks) || 0) +
        (Number(grade.practicalMarks) || 0) +
        (Number(grade.writtenMarks) || 0) +
        (Number(grade.attendanceMarks) || 0) +
        (Number(grade.quizzesMarks) || 0) +
        (Number(grade.finalExamMarks) || 0);

      const newTotal = Math.round((oldTotal - oldValue) * 100) / 100;

      try {
        await this.prisma.traineeGrades.update({
          where: { id: grade.id },
          data: {
            [component]: 0,
            totalMarks: newTotal,
            notes: `تم تصفير ${component} (كان ${oldValue}) - إجراء إداري`,
          },
        });

        totalUpdated++;
        details.push({
          traineeId: grade.traineeId,
          traineeName: grade.trainee.nameAr,
          contentName: grade.trainingContent.name,
          oldValue,
          oldTotal: Math.round(oldTotal * 100) / 100,
          newTotal,
        });
      } catch (err: any) {
        errors.push(`خطأ للمتدرب ${grade.trainee.nameAr}: ${err.message}`);
      }
    }

    return {
      component,
      threshold,
      totalUpdated,
      totalErrors: errors.length,
      details: details.slice(0, 500),
      errors: errors.slice(0, 20),
    };
  }
}
