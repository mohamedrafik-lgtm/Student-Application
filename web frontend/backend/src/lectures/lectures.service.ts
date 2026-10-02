import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class LecturesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createLectureDto: CreateLectureDto, userId: string) {
    // التحقق من وجود المحتوى التدريبي
    const trainingContent = await this.prisma.trainingContent.findUnique({
      where: { id: createLectureDto.contentId },
    });

    if (!trainingContent) {
      throw new NotFoundException(`Training content with ID ${createLectureDto.contentId} not found`);
    }

    // التحقق من أن رقم الباب ضمن نطاق أبواب المحتوى التدريبي
    if (createLectureDto.chapter > trainingContent.chaptersCount) {
      throw new NotFoundException(`Chapter ${createLectureDto.chapter} exceeds the content's chapters count (${trainingContent.chaptersCount})`);
    }

    const lecture = await this.prisma.lecture.create({
      data: createLectureDto,
    });

    await this.auditService.log({
      action: AuditAction.CREATE,
      entity: 'Lecture',
      entityId: String(lecture.id),
      userId,
      details: { message: `Created lecture: ${lecture.title} for content ID: ${lecture.contentId}` },
    });

    return lecture;
  }

  async findAll() {
    return this.prisma.lecture.findMany({
      include: {
        content: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  async findByContentId(contentId: number) {
    return this.prisma.lecture.findMany({
      where: {
        contentId,
      },
      orderBy: [
        { chapter: 'asc' },
        { order: 'asc' },
      ],
    });
  }

  async findOne(id: number) {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id },
      include: {
        content: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!lecture) {
      throw new NotFoundException(`Lecture with ID ${id} not found`);
    }

    return lecture;
  }

  async update(id: number, updateLectureDto: UpdateLectureDto, userId: string) {
    const lecture = await this.findOne(id);

    // إذا تم تحديث المحتوى التدريبي أو رقم الباب، تحقق من صحة البيانات
    if (updateLectureDto.contentId || updateLectureDto.chapter) {
      const contentId = updateLectureDto.contentId || lecture.contentId;
      const chapter = updateLectureDto.chapter || lecture.chapter;
      
      const trainingContent = await this.prisma.trainingContent.findUnique({
        where: { id: contentId },
      });

      if (!trainingContent) {
        throw new NotFoundException(`Training content with ID ${contentId} not found`);
      }

      if (chapter > trainingContent.chaptersCount) {
        throw new NotFoundException(`Chapter ${chapter} exceeds the content's chapters count (${trainingContent.chaptersCount})`);
      }
    }

    // Si no se proporciona un nuevo archivo PDF, conservar el archivo existente
    if (updateLectureDto.pdfFile === undefined) {
      // Eliminar la propiedad pdfFile para que no se actualice
      const { pdfFile, ...updateDataWithoutPdf } = updateLectureDto;
      updateLectureDto = updateDataWithoutPdf;
    }

    const updatedLecture = await this.prisma.lecture.update({
      where: { id },
      data: updateLectureDto,
    });

    // تحويل كائنات التاريخ إلى نص للتسجيل
    const lectureSafe = {
      ...lecture,
      createdAt: lecture.createdAt.toISOString(),
      updatedAt: lecture.updatedAt.toISOString()
    };

    const updatedLectureSafe = {
      ...updatedLecture,
      createdAt: updatedLecture.createdAt.toISOString(),
      updatedAt: updatedLecture.updatedAt.toISOString()
    };

    await this.auditService.log({
      action: AuditAction.UPDATE,
      entity: 'Lecture',
      entityId: String(id),
      userId,
      details: { before: lectureSafe, after: updatedLectureSafe },
    });

    return updatedLecture;
  }

  async remove(id: number, userId: string) {
    const lecture = await this.findOne(id);

    await this.prisma.lecture.delete({
      where: { id },
    });

    // تحويل كائنات التاريخ إلى نص للتسجيل
    const lectureSafe = {
      ...lecture,
      createdAt: lecture.createdAt.toISOString(),
      updatedAt: lecture.updatedAt.toISOString()
    };

    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'Lecture',
      entityId: String(id),
      userId,
      details: { deletedLecture: lectureSafe },
    });

    return { message: 'Lecture deleted successfully' };
  }
} 