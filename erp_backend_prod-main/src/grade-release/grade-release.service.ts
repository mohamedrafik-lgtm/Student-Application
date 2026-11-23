import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeReleaseDto, UpdateGradeReleaseDto } from './dto/grade-release.dto';

@Injectable()
export class GradeReleaseService {
  constructor(private prisma: PrismaService) {}

  /**
   * جلب جميع البرامج التدريبية مع الفصول الدراسية وإعدادات الإعلان
   */
  async getAllProgramsWithSemesters() {
    const programs = await this.prisma.trainingProgram.findMany({
      include: {
        classrooms: {
          select: {
            id: true,
            name: true,
            classNumber: true,
            startDate: true,
            endDate: true,
          },
          orderBy: {
            classNumber: 'asc',
          },
        },
        gradeReleaseSettings: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        traineeFees: {
          select: {
            id: true,
            name: true,
            amount: true,
            type: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return programs.map(program => ({
      ...program,
      availableSemesters: this.getAvailableSemesters(program.classrooms),
    }));
  }

  /**
   * استخراج الفصول الدراسية المتاحة من الفصول الموجودة
   */
  private getAvailableSemesters(classrooms: any[]) {
    const semesters = new Set<string>();
    
    // افتراضياً، كل برنامج لديه فصلين دراسيين
    if (classrooms.length > 0) {
      semesters.add('FIRST');
      semesters.add('SECOND');
    }

    return Array.from(semesters);
  }

  /**
   * إنشاء إعداد إعلان درجات جديد
   */
  async create(createDto: CreateGradeReleaseDto, userId: string) {
    // التحقق من وجود البرنامج
    const program = await this.prisma.trainingProgram.findUnique({
      where: { id: createDto.programId },
    });

    if (!program) {
      throw new NotFoundException('البرنامج التدريبي غير موجود');
    }

    // التحقق من عدم وجود إعداد مسبق
    const existing = await this.prisma.gradeReleaseSettings.findUnique({
      where: {
        programId_semester_academicYear: {
          programId: createDto.programId,
          semester: createDto.semester,
          academicYear: createDto.academicYear,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('يوجد إعداد مسبق لهذا الفصل الدراسي');
    }

    return this.prisma.gradeReleaseSettings.create({
      data: {
        ...createDto,
        isReleased: true,
        releasedAt: new Date(),
        releasedBy: userId,
      },
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
    });
  }

  /**
   * تحديث إعداد إعلان الدرجات
   */
  async update(id: string, updateDto: UpdateGradeReleaseDto, userId: string) {
    const existing = await this.prisma.gradeReleaseSettings.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('الإعداد غير موجود');
    }

    const data: any = { ...updateDto };

    // إذا تم تفعيل الإعلان، سجل التاريخ والمستخدم
    if (updateDto.isReleased !== undefined) {
      if (updateDto.isReleased && !existing.isReleased) {
        data.releasedAt = new Date();
        data.releasedBy = userId;
      } else if (!updateDto.isReleased && existing.isReleased) {
        data.releasedAt = null;
        data.releasedBy = null;
      }
    }

    return this.prisma.gradeReleaseSettings.update({
      where: { id },
      data,
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
    });
  }

  /**
   * حذف إعداد
   */
  async remove(id: string) {
    const existing = await this.prisma.gradeReleaseSettings.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('الإعداد غير موجود');
    }

    await this.prisma.gradeReleaseSettings.delete({
      where: { id },
    });

    return { message: 'تم الحذف بنجاح' };
  }

  /**
   * جلب إعداد محدد
   */
  async findOne(id: string) {
    const setting = await this.prisma.gradeReleaseSettings.findUnique({
      where: { id },
      include: {
        program: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
          },
        },
      },
    });

    if (!setting) {
      throw new NotFoundException('الإعداد غير موجود');
    }

    return setting;
  }
}
