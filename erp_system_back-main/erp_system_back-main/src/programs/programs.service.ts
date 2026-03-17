import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { toJsonValue } from '../lib/utils';

@Injectable()
export class ProgramsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createProgramDto: CreateProgramDto, userId: string) {
    const program = await this.prisma.trainingProgram.create({
      data: createProgramDto,
    });

    await this.auditService.log({
      action: AuditAction.CREATE,
      entity: 'TrainingProgram',
      entityId: String(program.id),
      userId,
      details: { message: `Created program ${program.nameAr}` },
    });

    return program;
  }

  async findAll(allowedProgramIds?: number[]) {
    return this.prisma.trainingProgram.findMany({
      where: allowedProgramIds ? { id: { in: allowedProgramIds } } : undefined,
      include: {
        _count: {
          select: {
            trainees: true,
            classrooms: true,
          },
        },
        classrooms: {
          orderBy: {
            classNumber: 'asc',
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const program = await this.prisma.trainingProgram.findUnique({
      where: { id },
      include: {
        trainees: true,
        classrooms: {
          include: {
            _count: {
              select: {
                trainingContents: true,
              },
            },
          },
          orderBy: {
            classNumber: 'asc',
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    return program;
  }

  async update(id: number, updateProgramDto: UpdateProgramDto, userId: string) {
    const before = await this.findOne(id);

    if (!before) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    const after = await this.prisma.trainingProgram.update({
      where: { id },
      data: updateProgramDto,
    });

    await this.auditService.log({
      action: AuditAction.UPDATE,
      entity: 'TrainingProgram',
      entityId: String(id),
      userId,
      details: toJsonValue({ before, after }),
    });

    return after;
  }

  async remove(id: number, userId: string) {
    const programToDelete = await this.findOne(id);

    if (!programToDelete) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    const traineeCount = await this.prisma.trainee.count({
      where: { programId: id },
    });

    if (traineeCount > 0) {
      throw new BadRequestException(
        `لا يمكن حذف البرنامج التدريبي لأنه يحتوي على ${traineeCount} متدرب مسجل. يرجى نقل المتدربين لبرنامج آخر أولاً أو إلغاء تسجيلهم.`,
      );
    }

    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'TrainingProgram',
      entityId: String(id),
      userId,
      details: toJsonValue({ message: `Deleted program ${programToDelete.nameAr}`, deletedData: programToDelete }),
    });

    return this.prisma.trainingProgram.delete({
      where: { id },
    });
  }

  async getStats(allowedProgramIds?: number[]) {
    const programWhere = allowedProgramIds ? { id: { in: allowedProgramIds } } : {};
    
    const totalPrograms = await this.prisma.trainingProgram.count({ where: programWhere });
    
    const activePrograms = await this.prisma.trainingProgram.count({
      where: {
        ...programWhere,
        trainees: {
          some: {
            traineeStatus: {
              in: ['NEW', 'CURRENT'],
            },
          },
        },
      },
    });

    const programsWithTrainees = await this.prisma.trainingProgram.findMany({
      where: programWhere,
      include: {
        trainees: {
          select: {
            traineeStatus: true,
          },
        },
      },
    });

    let completedPrograms = 0;
    programsWithTrainees.forEach(program => {
      const totalTrainees = program.trainees.length;
      const graduates = program.trainees.filter(t => t.traineeStatus === 'GRADUATE').length;
      
      if (totalTrainees > 0 && graduates === totalTrainees) {
        completedPrograms++;
      }
    });

    const completionRate = totalPrograms > 0 ? Math.round((completedPrograms / totalPrograms) * 100) : 0;

    return {
      totalPrograms,
      activePrograms,
      completedPrograms,
      completionRate,
    };
  }

  async updateClassrooms(programId: number, numberOfClassrooms: number) {
    // التحقق من وجود البرنامج
    const program = await this.findOne(programId);

    // حذف جميع الفصول الحالية
    await this.prisma.classroom.deleteMany({
      where: { programId },
    });

    // إنشاء الفصول الجديدة
    const classrooms = [];
    for (let i = 1; i <= numberOfClassrooms; i++) {
      const classroom = await this.prisma.classroom.create({
        data: {
          name: `الفصل ${i}`,
          classNumber: i,
          programId,
        },
      });
      classrooms.push(classroom);
    }

    // تحديث عدد الفصول في البرنامج
    await this.prisma.trainingProgram.update({
      where: { id: programId },
      data: { numberOfClassrooms },
    });

    return {
      program,
      classrooms,
      numberOfClassrooms,
    };
  }

  async updateSingleClassroom(
    classroomId: number,
    updateDto: { name?: string; startDate?: string; endDate?: string }
  ) {
    const data: any = {};
    
    if (updateDto.name !== undefined) {
      data.name = updateDto.name;
    }
    
    if (updateDto.startDate !== undefined) {
      data.startDate = updateDto.startDate ? new Date(updateDto.startDate) : null;
    }
    
    if (updateDto.endDate !== undefined) {
      data.endDate = updateDto.endDate ? new Date(updateDto.endDate) : null;
    }
    
    return this.prisma.classroom.update({
      where: { id: classroomId },
      data,
    });
  }

  async findClassroom(classroomId: number) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
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

    if (!classroom) {
      throw new NotFoundException(`Classroom with ID ${classroomId} not found`);
    }

    return classroom;
  }

  async getProgramReport(programId: number) {
    // جلب معلومات البرنامج
    const program = await this.prisma.trainingProgram.findUnique({
      where: { id: programId },
      include: {
        classrooms: {
          select: {
            id: true,
            name: true,
            classNumber: true,
          },
          orderBy: {
            classNumber: 'asc',
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundException(`Program with ID ${programId} not found`);
    }

    // عدد المتدربين في البرنامج
    const traineesCount = await this.prisma.trainee.count({
      where: { programId },
    });

    // جلب جميع المحتويات التدريبية المرتبطة بالبرنامج
    const trainingContents = await this.prisma.trainingContent.findMany({
      where: { programId },
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
            classNumber: true,
          },
        },
        instructor: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            questions: true,
            scheduleSlots: true,
          },
        },
      },
      orderBy: [
        { classroom: { classNumber: 'asc' } },
        { name: 'asc' },
      ],
    });

    // جلب عدد الجلسات (المحاضرات) لكل محتوى تدريبي
    const contentsWithSessions = await Promise.all(
      trainingContents.map(async (content) => {
        const sessionsCount = await this.prisma.session.count({
          where: { contentId: content.id },
        });

        return {
          id: content.id,
          name: content.name,
          code: content.code,
          classroom: content.classroom,
          instructor: content.instructor,
          sessionsCount,
          questionsCount: content._count.questions,
          scheduleSlotsCount: content._count.scheduleSlots,
        };
      })
    );

    // تجميع البيانات حسب الفصول
    const classroomsData = program.classrooms.map((classroom) => {
      const classroomContents = contentsWithSessions.filter(
        (content) => content.classroom?.id === classroom.id
      );

      const totalSessions = classroomContents.reduce(
        (sum, content) => sum + content.sessionsCount,
        0
      );
      const totalQuestions = classroomContents.reduce(
        (sum, content) => sum + content.questionsCount,
        0
      );

      return {
        classroom,
        contents: classroomContents,
        totalContents: classroomContents.length,
        totalSessions,
        totalQuestions,
      };
    });

    return {
      program: {
        id: program.id,
        nameAr: program.nameAr,
        nameEn: program.nameEn,
        price: program.price,
        description: program.description,
        numberOfClassrooms: program.numberOfClassrooms,
      },
      traineesCount,
      classrooms: classroomsData,
      summary: {
        totalTrainees: traineesCount,
        totalClassrooms: program.classrooms.length,
        totalContents: trainingContents.length,
        totalSessions: contentsWithSessions.reduce(
          (sum, content) => sum + content.sessionsCount,
          0
        ),
        totalQuestions: contentsWithSessions.reduce(
          (sum, content) => sum + content.questionsCount,
          0
        ),
      },
    };
  }
}