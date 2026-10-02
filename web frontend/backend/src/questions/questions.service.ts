import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createQuestionDto: CreateQuestionDto) {
    const { options, ...questionData } = createQuestionDto;
    
    // Verificar que el contenido de formación existe
    const contentExists = await this.prisma.trainingContent.findUnique({
      where: { id: questionData.contentId },
    });
    
    if (!contentExists) {
      throw new NotFoundException(`Training content with ID ${questionData.contentId} not found`);
    }
    
    // Validar que existe un ID de usuario válido
    if (!questionData.createdById) {
      throw new BadRequestException('User ID is required to create a question');
    }

    // Intentamos encontrar al usuario, pero si no lo encontramos, usamos un ID de administrador por defecto
    let userId = questionData.createdById;
    try {
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!userExists) {
        // Intentamos encontrar algún usuario con rol de ADMIN para asignarlo como creador
        const adminUser = await this.prisma.user.findFirst({
          where: { email: 'admin@tiba.com' }
        });
        
        if (adminUser) {
          console.log(`User with ID ${userId} not found. Using admin user ${adminUser.id} as creator`);
          userId = adminUser.id;
        } else {
          throw new NotFoundException(`No valid user found to create the question`);
        }
      }
    } catch (error) {
      console.error('Error checking user existence:', error);
      // En caso de error, intentamos encontrar algún usuario como fallback
      const anyUser = await this.prisma.user.findFirst();
      if (!anyUser) {
        throw new BadRequestException('No users exist in the system to create a question');
      }
      userId = anyUser.id;
    }
    
    // Crear la pregunta y sus opciones en una transacción
    const question = await this.prisma.$transaction(async (prisma) => {
      // Crear la pregunta
      const newQuestion = await prisma.question.create({
        data: {
          text: questionData.text,
          type: questionData.type,
          skill: questionData.skill,
          difficulty: questionData.difficulty,
          chapter: questionData.chapter,
          contentId: questionData.contentId,
          createdById: userId,
          options: {
            create: options,
          },
        },
        include: {
          options: true,
          content: {
            select: {
              name: true,
              code: true,
            },
          },
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Registrar la acción en el log de auditoría
      // Convertir a un objeto JSON serializable
      const questionForLog = {
        id: newQuestion.id,
        text: newQuestion.text,
        type: newQuestion.type,
        skill: newQuestion.skill,
        difficulty: newQuestion.difficulty,
        chapter: newQuestion.chapter,
        contentId: newQuestion.contentId,
        contentName: newQuestion.content?.name,
        contentCode: newQuestion.content?.code,
        createdBy: newQuestion.createdBy?.name,
        optionsCount: newQuestion.options.length
      };
      
      await this.auditService.log({
        action: AuditAction.CREATE,
        entity: 'Question',
        entityId: String(newQuestion.id),
        userId: userId,
        details: { question: questionForLog },
      });

      return newQuestion;
    });

    return question;
  }

  async findAll() {
    return this.prisma.question.findMany({
      include: {
        options: true,
        content: {
          select: {
            name: true,
            code: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByContentId(contentId: number, excludeUsedInPaperExams: boolean = false) {
    // إذا كان المطلوب استبعاد الأسئلة المستخدمة في اختبارات ورقية
    if (excludeUsedInPaperExams) {
      // جلب IDs الأسئلة المستخدمة في اختبارات ورقية لنفس المادة
      const usedQuestionIds = await this.prisma.paperExamQuestion.findMany({
        where: {
          question: {
            contentId: contentId,
          },
        },
        select: {
          questionId: true,
        },
        distinct: ['questionId'],
      });

      const usedIds = usedQuestionIds.map(q => q.questionId);

      console.log(`📊 استبعاد ${usedIds.length} سؤال مستخدم في اختبارات ورقية سابقة للمادة ${contentId}`);

      // جلب الأسئلة مع استبعاد المستخدمة
      return this.prisma.question.findMany({
        where: {
          contentId,
          id: {
            notIn: usedIds.length > 0 ? usedIds : undefined,
          },
        },
        include: {
          options: true,
          content: {
            select: {
              name: true,
              code: true,
            },
          },
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    // الحالة العادية: جلب جميع الأسئلة
    return this.prisma.question.findMany({
      where: {
        contentId,
      },
      include: {
        options: true,
        content: {
          select: {
            name: true,
            code: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        options: true,
        content: {
          select: {
            name: true,
            code: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return question;
  }

  async update(id: number, updateQuestionDto: UpdateQuestionDto) {
    const { options, ...questionData } = updateQuestionDto;
    
    // Verificar que la pregunta existe
    const existingQuestion = await this.prisma.question.findUnique({
      where: { id },
      include: { options: true },
    });
    
    if (!existingQuestion) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }
    
    // Actualizar la pregunta y sus opciones en una transacción
    return this.prisma.$transaction(async (prisma) => {
      // Actualizar la pregunta
      const updatedQuestion = await prisma.question.update({
        where: { id },
        data: questionData,
        include: {
          options: true,
          content: {
            select: {
              name: true,
              code: true,
            },
          },
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
      
      // Si se proporcionan nuevas opciones, actualizar las opciones
      if (options && options.length > 0) {
        // Eliminar las opciones existentes
        await prisma.questionOption.deleteMany({
          where: { questionId: id },
        });
        
        // Crear las nuevas opciones
        await prisma.questionOption.createMany({
          data: options.map(option => ({
            ...option,
            questionId: id,
          })),
        });
        
        // Obtener la pregunta actualizada con las nuevas opciones
        const questionWithOptions = await prisma.question.findUnique({
          where: { id },
          include: {
            options: true,
            content: {
              select: {
                name: true,
                code: true,
              },
            },
            createdBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });
        
        return questionWithOptions;
      }
      
      return updatedQuestion;
    });
  }

  async remove(id: number) {
    // Verificar que la pregunta existe
    const question = await this.prisma.question.findUnique({
      where: { id },
    });
    
    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }
    
    // Eliminar la pregunta (las opciones se eliminarán automáticamente por la relación onDelete: Cascade)
    await this.prisma.question.delete({
      where: { id },
    });
    
    return { id, deleted: true };
  }
} 