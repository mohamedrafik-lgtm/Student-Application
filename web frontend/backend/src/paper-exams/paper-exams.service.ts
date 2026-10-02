import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaperExamDto } from './dto/create-paper-exam.dto';
import { UpdatePaperExamDto } from './dto/update-paper-exam.dto';
import { CreateExamModelDto } from './dto/create-exam-model.dto';
import { SubmitAnswerSheetDto } from './dto/submit-answer-sheet.dto';
import { BatchGradingService } from './batch-grading.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class PaperExamsService {
  constructor(
    private prisma: PrismaService,
    private batchGradingService: BatchGradingService,
  ) {}

  /**
   * إنشاء اختبار ورقي جديد
   */
  async create(createDto: CreatePaperExamDto, userId: string) {
    // التحقق من وجود المادة التدريبية
    const content = await this.prisma.trainingContent.findUnique({
      where: { id: createDto.trainingContentId },
      include: {
        classroom: true,
        program: true,
      },
    });

    if (!content) {
      throw new NotFoundException('المادة التدريبية غير موجودة');
    }

    // التحقق من أن الدرجات المطلوبة لا تتجاوز الحد الأقصى
    const maxMarksForType = this.getMaxMarksForGradeType(content, createDto.gradeType);
    
    if (createDto.totalMarks > maxMarksForType) {
      throw new BadRequestException(
        `إجمالي الدرجات (${createDto.totalMarks}) يتجاوز الحد الأقصى المسموح (${maxMarksForType}) لنوع الدرجة ${createDto.gradeType}`,
      );
    }

    const paperExam = await this.prisma.paperExam.create({
      data: {
        ...createDto,
        examDate: new Date(createDto.examDate),
        createdBy: userId,
      },
      include: {
        trainingContent: {
          include: {
            program: true,
            classroom: true,
            instructor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return paperExam;
  }

  /**
   * الحصول على الحد الأقصى للدرجات حسب النوع
   */
  private getMaxMarksForGradeType(content: any, gradeType: string): number {
    switch (gradeType) {
      case 'YEAR_WORK':
        return content.yearWorkMarks;
      case 'PRACTICAL':
        return content.practicalMarks;
      case 'WRITTEN':
        return content.writtenMarks;
      case 'FINAL_EXAM':
        return content.finalExamMarks;
      default:
        return 0;
    }
  }

  /**
   * إنشاء نموذج أسئلة للاختبار
   */
  async createModel(createDto: CreateExamModelDto, userId: string) {
    // التحقق من وجود الاختبار
    const paperExam = await this.prisma.paperExam.findUnique({
      where: { id: createDto.paperExamId },
    });

    if (!paperExam) {
      throw new NotFoundException('الاختبار الورقي غير موجود');
    }

    // التحقق من عدم تكرار رمز النموذج
    const existingModel = await this.prisma.paperExamModel.findUnique({
      where: {
        paperExamId_modelCode: {
          paperExamId: createDto.paperExamId,
          modelCode: createDto.modelCode,
        },
      },
    });

    if (existingModel) {
      throw new BadRequestException(`رمز النموذج "${createDto.modelCode}" مستخدم بالفعل في هذا الاختبار`);
    }

    // التحقق من وجود جميع الأسئلة
    const questionIds = createDto.questions.map(q => q.questionId);
    const questions = await this.prisma.question.findMany({
      where: {
        id: { in: questionIds },
        contentId: paperExam.trainingContentId,
      },
      include: {
        options: true,
      },
    });

    if (questions.length !== questionIds.length) {
      throw new BadRequestException('بعض الأسئلة غير موجودة أو لا تنتمي لنفس المادة التدريبية');
    }

    // حساب إجمالي النقاط
    const totalPoints = createDto.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    
    if (Math.abs(totalPoints - paperExam.totalMarks) > 0.01) {
      throw new BadRequestException(
        `مجموع نقاط الأسئلة (${totalPoints}) لا يساوي إجمالي درجات الاختبار (${paperExam.totalMarks})`,
      );
    }

    // ترتيب الأسئلة: اختيار متعدد أولاً، ثم صح/خطأ (حسب عدد الخيارات)
    const questionsWithDetails = createDto.questions.map(q => {
      const questionDetails = questions.find(qd => qd.id === q.questionId);
      return {
        ...q,
        optionsCount: questionDetails?.options.length || 0,
      };
    });

    // فصل الأسئلة
    const multipleChoice = questionsWithDetails.filter(q => q.optionsCount > 2);
    const trueFalse = questionsWithDetails.filter(q => q.optionsCount === 2);
    
    // دمج بالترتيب الصحيح وإعادة ترقيم orderInModel
    const sortedQuestions = [...multipleChoice, ...trueFalse].map((q, index) => ({
      questionId: q.questionId,
      orderInModel: index + 1, // ترقيم تسلسلي
      points: q.points || 1,
    }));

    const { questions: questionsDto, ...modelData } = createDto;

    const model = await this.prisma.paperExamModel.create({
      data: {
        ...modelData,
        questions: {
          create: sortedQuestions, // استخدام الأسئلة المرتبة
        },
      },
      include: {
        questions: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
          orderBy: {
            orderInModel: 'asc',
          },
        },
      },
    });

    return model;
  }

  /**
   * توليد أوراق الإجابة لجميع المتدربين
   */
  async generateAnswerSheets(paperExamId: number, modelId: number) {
    // التحقق من وجود الاختبار والنموذج
    const model = await this.prisma.paperExamModel.findUnique({
      where: { id: modelId },
      include: {
        paperExam: {
          include: {
            trainingContent: {
              include: {
                classroom: {
                  include: {
                    program: true,
                  },
                },
              },
            },
          },
        },
        questions: true,
      },
    });

    if (!model) {
      throw new NotFoundException('نموذج الاختبار غير موجود');
    }

    if (model.paperExamId !== paperExamId) {
      throw new BadRequestException('النموذج لا ينتمي لهذا الاختبار');
    }

    // جلب جميع المتدربين في البرنامج
    const trainees = await this.prisma.trainee.findMany({
      where: {
        programId: model.paperExam.trainingContent.classroom.programId,
      },
      select: {
        id: true,
        nameAr: true,
        nationalId: true,
      },
    });

    const answerSheets = [];

    // إنشاء ورقة إجابة لكل متدرب
    for (const trainee of trainees) {
      // التحقق من وجود ورقة في أي نموذج لهذا الاختبار
      const existing = await this.prisma.paperAnswerSheet.findFirst({
        where: {
          paperExamId,
          traineeId: trainee.id,
        },
      });

      if (existing) {
        // الطالب لديه ورقة بالفعل في نموذج آخر - تخطي
        console.log(`⏩ الطالب ${trainee.nameAr} لديه ورقة بالفعل - تخطي`);
        continue;
      }

      // توليد كود فريد
      const sheetCode = await this.generateSheetCode(paperExamId, modelId, trainee.id);
      
      // بيانات QR Code (سيتم مسحها بالكاميرا)
      const qrCodeData = JSON.stringify({
        sheetCode,
        examId: paperExamId,
        modelId,
        traineeId: trainee.id,
        traineeNationalId: trainee.nationalId,
      });

      const answerSheet = await this.prisma.paperAnswerSheet.create({
        data: {
          paperExamId,
          modelId,
          traineeId: trainee.id,
          sheetCode,
          qrCodeData,
          totalPoints: model.questions.reduce((sum, q) => sum + q.points, 0),
        },
      });

      answerSheets.push(answerSheet);
    }

    return {
      message: `تم إنشاء ${answerSheets.length} ورقة إجابة`,
      count: answerSheets.length,
      sheets: answerSheets,
    };
  }

  /**
   * إنشاء نماذج متعددة وتوزيع الطلاب عليها تلقائياً (ميزة جديدة)
   */
  async createMultipleModelsWithDistribution(
    paperExamId: number,
    numberOfModels: number,
    baseQuestions: Array<{ questionId: number; points: number }>,
    userId: string,
    distributionMethod: 'alphabetical' | 'by_distribution' | 'single_room' | 'custom_committees' | 'custom_groups' = 'alphabetical',
    distributionId?: string,
    roomId?: string,
    numberOfCommittees?: number,
    modelsPerCommittee?: number,
    groupsSettings?: Array<{ roomId: string; numberOfCommittees: number; modelsPerCommittee: number }>
  ) {
    // جلب الاختبار
    const paperExam = await this.prisma.paperExam.findUnique({
      where: { id: paperExamId },
      include: {
        trainingContent: {
          include: {
            classroom: true,
          },
        },
      },
    });

    if (!paperExam) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    let trainees: Array<{ id: number; nameAr: string; nationalId: string }> = [];
    let distributionRooms: any[] = [];

    if ((distributionMethod === 'by_distribution' || distributionMethod === 'single_room' || distributionMethod === 'custom_committees') && distributionId) {
      // 🎯 الطريقة الجديدة: حسب التوزيع الموجود
      console.log(`📊 استخدام التوزيع: ${distributionId}`);
      
      const distribution = await this.prisma.traineeDistribution.findUnique({
        where: { id: distributionId },
        include: {
          rooms: {
            include: {
              assignments: {
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
                  orderNumber: 'asc', // ترتيب حسب الترتيب داخل المجموعة
                },
              },
            },
            orderBy: {
              roomNumber: 'asc', // ترتيب المجموعات
            },
          },
        },
      });

      if (!distribution) {
        throw new NotFoundException('التوزيع المحدد غير موجود');
      }

      // التحقق من أن التوزيع ينتمي لنفس البرنامج
      if (distribution.programId !== paperExam.trainingContent.classroom.programId) {
        throw new BadRequestException('التوزيع المحدد لا ينتمي لنفس البرنامج');
      }

      // فلترة المجموعات إذا كان single_room أو custom_committees
      if ((distributionMethod === 'single_room' || distributionMethod === 'custom_committees') && roomId) {
        // مجموعة واحدة فقط
        const singleRoom = distribution.rooms.find(r => r.id === roomId);
        if (!singleRoom) {
          throw new NotFoundException('المجموعة المحددة غير موجودة');
        }
        distributionRooms = [singleRoom];
        
        if (distributionMethod === 'custom_committees') {
          console.log(`🎯 لجان مخصصة للمجموعة: ${singleRoom.roomName} (${singleRoom.assignments.length} طالب)`);
          console.log(`📋 عدد اللجان: ${numberOfCommittees}, نماذج لكل لجنة: ${modelsPerCommittee}`);
        } else {
          console.log(`🎯 اختبار لمجموعة واحدة: ${singleRoom.roomName} (${singleRoom.assignments.length} طالب)`);
        }
      } else {
        // جميع المجموعات
        distributionRooms = distribution.rooms;
      }
      
      const totalStudents = distributionRooms.reduce((sum, room) => sum + room.assignments.length, 0);

      console.log(`✅ تم تحميل ${distributionRooms.length} مجموعات`);
      console.log(`📌 نوع التوزيع: ${distribution.type === 'THEORY' ? 'نظري' : 'عملي'}`);
      console.log(`👥 إجمالي الطلاب: ${totalStudents}`);
      
      // طباعة تفاصيل كل مجموعة
      distributionRooms.forEach((room, index) => {
        console.log(`   ${index + 1}. ${room.roomName}: ${room.assignments.length} طالب`);
        if (room.assignments.length > 0) {
          console.log(`      - أول طالب: ${room.assignments[0].trainee.nameAr}`);
          if (room.assignments.length > 1) {
            console.log(`      - ثاني طالب: ${room.assignments[1].trainee.nameAr}`);
          }
        }
      });
    } else {
      // 🔤 الطريقة القديمة: ترتيب أبجدي
      console.log(`📊 استخدام الترتيب الأبجدي`);
      
      trainees = await this.prisma.trainee.findMany({
        where: {
          programId: paperExam.trainingContent.classroom.programId,
          traineeStatus: {
            in: ['NEW', 'CURRENT'], // فقط الطلاب النشطين
          },
        },
        select: {
          id: true,
          nameAr: true,
          nationalId: true,
        },
        orderBy: {
          nameAr: 'asc', // ترتيب أبجدي
        },
      });
    }

    // التحقق من وجود طلاب
    const totalStudentsCount = (distributionMethod === 'by_distribution' || distributionMethod === 'single_room' || distributionMethod === 'custom_committees') && distributionRooms.length > 0
      ? distributionRooms.reduce((sum, room) => sum + room.assignments.length, 0)
      : trainees.length;

    if (totalStudentsCount === 0) {
      throw new BadRequestException('لا يوجد طلاب للتوزيع');
    }

    console.log(`📊 ${totalStudentsCount} طالب - ${numberOfModels} نماذج - طريقة: ${distributionMethod}`);

    // توليد رموز النماذج
    const modelCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const createdModels = [];
    const allSheets = [];

    // تحديد عدد النماذج المطلوبة
    let actualNumberOfModels = numberOfModels;
    if (distributionMethod === 'custom_committees' && modelsPerCommittee) {
      actualNumberOfModels = modelsPerCommittee;
      console.log(`🔧 تعديل عدد النماذج للجان المخصصة: ${actualNumberOfModels} نماذج`);
    }

    // التحقق من النماذج الموجودة مسبقاً
    const existingModels = await this.prisma.paperExamModel.findMany({
      where: {
        paperExamId,
        modelCode: {
          in: modelCodes.slice(0, actualNumberOfModels),
        },
      },
      include: {
        questions: true,
      },
    });

    console.log(`📋 نماذج موجودة: ${existingModels.length}/${actualNumberOfModels}`);

    // إنشاء النماذج أو استخدام الموجودة
    for (let i = 0; i < actualNumberOfModels; i++) {
      const modelCode = modelCodes[i];
      const modelName = `نموذج ${modelCode}`;

      // التحقق من وجود النموذج
      let model = existingModels.find(m => m.modelCode === modelCode);

      if (model) {
        console.log(`♻️ استخدام نموذج موجود: ${modelCode}`);
      } else {
        // خلط الأسئلة لهذا النموذج
        const shuffledQuestions = [...baseQuestions].sort(() => Math.random() - 0.5);
        const questionsWithOrder = shuffledQuestions.map((q, index) => ({
          questionId: q.questionId,
          orderInModel: index + 1,
          points: q.points,
        }));

        // إنشاء النموذج الجديد
        model = await this.prisma.paperExamModel.create({
          data: {
            paperExamId,
            modelCode,
            modelName,
            shuffleQuestions: true,
            shuffleOptions: true,
            distributionMethod: distributionMethod.toUpperCase() as any,
            questions: {
              create: questionsWithOrder,
            },
          },
          include: {
            questions: true,
          },
        });

        console.log(`✅ نموذج جديد ${modelCode} - ${model.questions.length} سؤال`);
      }

      createdModels.push(model);
    }

    // توزيع الطلاب على النماذج
    let currentModelIndex = 0;
    
    if (distributionMethod === 'custom_committees' && distributionRooms.length > 0) {
      // 🏛️ اللجان المخصصة: تقسيم المجموعة إلى لجان وتوزيع النماذج بالتتابع
      console.log(`🏛️ توزيع لجان مخصصة`);
      
      const room = distributionRooms[0]; // مجموعة واحدة فقط
      const students = room.assignments.map(a => a.trainee);
      const studentsPerCommittee = Math.ceil(students.length / numberOfCommittees);
      
      console.log(`📊 ${students.length} طالب ÷ ${numberOfCommittees} لجان = ~${studentsPerCommittee} طالب/لجنة`);
      console.log(`📝 ${modelsPerCommittee} نماذج لكل لجنة`);
      
      for (let committeeIndex = 0; committeeIndex < numberOfCommittees; committeeIndex++) {
        const startIndex = committeeIndex * studentsPerCommittee;
        const endIndex = Math.min(startIndex + studentsPerCommittee, students.length);
        const committeeStudents = students.slice(startIndex, endIndex);
        
        console.log(`\n🏛️ اللجنة ${committeeIndex + 1}: ${committeeStudents.length} طالب (من ${startIndex + 1} إلى ${endIndex})`);
        
        // توزيع النماذج بالتتابع داخل اللجنة
        for (let studentIndex = 0; studentIndex < committeeStudents.length; studentIndex++) {
          const trainee = committeeStudents[studentIndex];
          const modelIndex = studentIndex % modelsPerCommittee; // التتابع: 0,1,2,3,0,1,2,3...
          const model = createdModels[modelIndex];
          
          // توليد كود فريد
          const sheetCode = await this.generateSheetCode(paperExamId, model.id, trainee.id);
          
          const qrCodeData = JSON.stringify({
            sheetCode,
            examId: paperExamId,
            modelId: model.id,
            traineeId: trainee.id,
            traineeNationalId: trainee.nationalId,
            roomName: room.roomName,
            committeeNumber: committeeIndex + 1,
          });

          const sheet = await this.prisma.paperAnswerSheet.create({
            data: {
              paperExamId,
              modelId: model.id,
              traineeId: trainee.id,
              sheetCode,
              qrCodeData,
              totalPoints: model.questions.reduce((sum, q) => sum + q.points, 0),
            },
          });

          allSheets.push(sheet);
          
          if (studentIndex < 3) {
            console.log(`   ${studentIndex + 1}. ${trainee.nameAr} → نموذج ${model.modelCode}`);
          }
        }
      }
    } else if (distributionMethod === 'custom_groups' && groupsSettings && groupsSettings.length > 0) {
      // 🏢 المجموعات المخصصة: كل مجموعة لها إعدادات لجان ونماذج خاصة
      console.log(`🏢 توزيع مجموعات مخصصة: ${groupsSettings.length} مجموعات`);
      
      for (const groupSetting of groupsSettings) {
        const room = distributionRooms.find(r => r.id === groupSetting.roomId);
        if (!room) continue;
        
        const students = room.assignments.map(a => a.trainee);
        const studentsPerCommittee = Math.ceil(students.length / groupSetting.numberOfCommittees);
        
        console.log(`\n📦 ${room.roomName}: ${students.length} طالب → ${groupSetting.numberOfCommittees} لجان × ${groupSetting.modelsPerCommittee} نماذج`);
        
        // تقسيم المجموعة إلى لجان
        for (let committeeIndex = 0; committeeIndex < groupSetting.numberOfCommittees; committeeIndex++) {
          const startIndex = committeeIndex * studentsPerCommittee;
          const endIndex = Math.min(startIndex + studentsPerCommittee, students.length);
          const committeeStudents = students.slice(startIndex, endIndex);
          
          console.log(`   🏛️ اللجنة ${committeeIndex + 1}: ${committeeStudents.length} طالب`);
          
          // توزيع النماذج بالتتابع داخل اللجنة
          for (let studentIndex = 0; studentIndex < committeeStudents.length; studentIndex++) {
            const trainee = committeeStudents[studentIndex];
            const modelIndex = studentIndex % groupSetting.modelsPerCommittee;
            const model = createdModels[modelIndex];
            
            const sheetCode = await this.generateSheetCode(paperExamId, model.id, trainee.id);
            
            const qrCodeData = JSON.stringify({
              sheetCode,
              examId: paperExamId,
              modelId: model.id,
              traineeId: trainee.id,
              traineeNationalId: trainee.nationalId,
              roomName: room.roomName,
              committeeNumber: committeeIndex + 1,
              groupId: room.id,
            });

            const sheet = await this.prisma.paperAnswerSheet.create({
              data: {
                paperExamId,
                modelId: model.id,
                traineeId: trainee.id,
                sheetCode,
                qrCodeData,
                totalPoints: model.questions.reduce((sum, q) => sum + q.points, 0),
              },
            });

            allSheets.push(sheet);
          }
        }
      }
    } else if ((distributionMethod === 'by_distribution' || distributionMethod === 'single_room') && distributionRooms.length > 0) {
      // 🎯 التوزيع حسب المجموعات
      console.log(`📋 توزيع حسب ${distributionRooms.length} مجموعات`);
      
      for (const room of distributionRooms) {
        // تحديد النموذج لهذه المجموعة
        const model = createdModels[currentModelIndex % numberOfModels];
        
        console.log(`📌 ${room.roomName} → نموذج ${model.modelCode} (${room.assignments.length} طالب)`);
        
        for (const assignment of room.assignments) {
          const trainee = assignment.trainee;
          
          // توليد كود فريد
          const sheetCode = await this.generateSheetCode(paperExamId, model.id, trainee.id);
          
          const qrCodeData = JSON.stringify({
            sheetCode,
            examId: paperExamId,
            modelId: model.id,
            traineeId: trainee.id,
            traineeNationalId: trainee.nationalId,
            roomName: room.roomName,
          });

          const sheet = await this.prisma.paperAnswerSheet.create({
            data: {
              paperExamId,
              modelId: model.id,
              traineeId: trainee.id,
              sheetCode,
              qrCodeData,
              totalPoints: model.questions.reduce((sum, q) => sum + q.points, 0),
            },
          });

          allSheets.push(sheet);
        }
        
        currentModelIndex++; // الانتقال للنموذج التالي
      }
    } else {
      // 🔤 التوزيع الأبجدي (الطريقة القديمة)
      const studentsPerModel = Math.ceil(trainees.length / numberOfModels);
      
      for (let i = 0; i < trainees.length; i++) {
        const trainee = trainees[i];
        const modelIndex = Math.floor(i / studentsPerModel);
        const model = createdModels[Math.min(modelIndex, createdModels.length - 1)];

        // توليد كود فريد
        const sheetCode = await this.generateSheetCode(paperExamId, model.id, trainee.id);
        
        const qrCodeData = JSON.stringify({
          sheetCode,
          examId: paperExamId,
          modelId: model.id,
          traineeId: trainee.id,
          traineeNationalId: trainee.nationalId,
        });

        const sheet = await this.prisma.paperAnswerSheet.create({
          data: {
            paperExamId,
            modelId: model.id,
            traineeId: trainee.id,
            sheetCode,
            qrCodeData,
            totalPoints: model.questions.reduce((sum, q) => sum + q.points, 0),
          },
        });

        allSheets.push(sheet);
      }
    }

    // إحصائيات
    const distribution = createdModels.map(m => ({
      modelCode: m.modelCode,
      modelName: m.modelName,
      studentsCount: allSheets.filter(s => s.modelId === m.id).length,
    }));

    const distributionInfo = distributionMethod === 'by_distribution' && distributionRooms.length > 0
      ? distributionRooms.map((room, index) => ({
          roomName: room.roomName,
          modelCode: createdModels[index % numberOfModels].modelCode,
          studentsCount: room.assignments.length,
        }))
      : distribution;

    let successMessage = '';
    if (distributionMethod === 'custom_committees') {
      successMessage = `تم إنشاء ${numberOfCommittees} لجان بـ ${modelsPerCommittee} نماذج لكل لجنة وتوزيع ${allSheets.length} ورقة`;
    } else if (distributionMethod === 'by_distribution') {
      successMessage = `تم إنشاء ${numberOfModels} نماذج وتوزيع ${allSheets.length} ورقة حسب التوزيع الموجود`;
    } else if (distributionMethod === 'single_room') {
      successMessage = `تم إنشاء نموذج واحد وتوزيع ${allSheets.length} ورقة للمجموعة المحددة`;
    } else {
      successMessage = `تم إنشاء ${numberOfModels} نماذج وتوزيع ${allSheets.length} ورقة أبجدياً`;
    }

    return {
      message: successMessage,
      models: createdModels.length,
      sheets: allSheets.length,
      distributionMethod,
      distribution: distributionInfo,
      ...(distributionMethod === 'custom_committees' && {
        committees: numberOfCommittees,
        modelsPerCommittee: modelsPerCommittee,
      }),
    };
  }

  /**
   * توليد كود فريد لورقة الإجابة
   */
  private async generateSheetCode(examId: number, modelId: number, traineeId: number): Promise<string> {
    // تنسيق: PE{examId}-M{modelId}-T{traineeId}
    return `PE${examId.toString().padStart(3, '0')}-M${modelId.toString().padStart(3, '0')}-T${traineeId.toString().padStart(4, '0')}`;
  }

  /**
   * مسح وتصحيح ورقة إجابة من الكاميرا
   */
  async processScannedAnswerSheet(
    sheetCode: string,
    ocrData: any,
    scannedImageUrl?: string,
    userId?: string,
  ) {
    // جلب ورقة الإجابة
    const answerSheet = await this.prisma.paperAnswerSheet.findUnique({
      where: { sheetCode },
      include: {
        model: {
          include: {
            paperExam: {
              select: {
                id: true,
                trainingContentId: true,
                gradeType: true,
                passingScore: true,
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
                orderInModel: 'asc',
              },
            },
          },
        },
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
          },
        },
      },
    });

    if (!answerSheet) {
      throw new NotFoundException(`ورقة الإجابة برمز "${sheetCode}" غير موجودة`);
    }

    // التحقق من عدم التصحيح المسبق
    if (answerSheet.status === 'GRADED' || answerSheet.status === 'VERIFIED') {
      throw new BadRequestException('تم تصحيح هذه الورقة مسبقاً');
    }

    // معالجة بيانات OCR وتصحيح الإجابات
    const answers = [];
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;

    for (const examQuestion of answerSheet.model.questions) {
      const selectedOptionId = ocrData.answers?.[examQuestion.questionId];
      
      if (!selectedOptionId) {
        // لم يتم اختيار إجابة
        answers.push({
          answerSheetId: answerSheet.id,
          questionId: examQuestion.questionId,
          selectedOptionId: null,
          isCorrect: false,
          points: 0,
          bubbleDetected: false,
        });
        continue;
      }

      // التحقق من الإجابة
      const correctOption = examQuestion.question.options.find(opt => opt.isCorrect);
      const isCorrect = correctOption && selectedOptionId === correctOption.id;
      const points = isCorrect ? examQuestion.points : 0;

      if (isCorrect) {
        correctCount++;
        score += points;
      } else {
        wrongCount++;
      }

      answers.push({
        answerSheetId: answerSheet.id,
        questionId: examQuestion.questionId,
        selectedOptionId,
        isCorrect,
        points,
        bubbleDetected: true,
        confidence: ocrData.confidence?.[examQuestion.questionId] || 0.95,
      });
    }

    const percentage = (score / answerSheet.totalPoints) * 100;
    const passed = percentage >= answerSheet.model.paperExam.passingScore;

    // حفظ النتائج في transaction
    await this.prisma.$transaction(async (tx) => {
      // حذف الإجابات القديمة إن وجدت
      await tx.paperAnswerSheetAnswer.deleteMany({
        where: { answerSheetId: answerSheet.id },
      });

      // حفظ الإجابات الجديدة
      await tx.paperAnswerSheetAnswer.createMany({
        data: answers,
      });

      // تحديث ورقة الإجابة
      await tx.paperAnswerSheet.update({
        where: { id: answerSheet.id },
        data: {
          score,
          percentage,
          passed,
          status: 'GRADED',
          gradedAt: new Date(),
          gradedBy: userId,
          scannedImageUrl,
          scannedAt: new Date(),
          scannedBy: userId,
          ocrData,
        },
      });
    });

    // تحديث درجات المتدرب تلقائياً
    await this.updateTraineeGrades(
      answerSheet.traineeId,
      answerSheet.model.paperExam.trainingContentId,
      answerSheet.model.paperExam.gradeType,
      score,
    );

    return {
      success: true,
      sheetCode,
      trainee: answerSheet.trainee,
      score,
      totalPoints: answerSheet.totalPoints,
      percentage,
      passed,
      correctCount,
      wrongCount,
      totalQuestions: answerSheet.model.questions.length,
    };
  }

  /**
   * الحصول على جميع أوراق الإجابة لنموذج معين
   */
  async getModelSheets(examId: number, modelId: number) {
    const sheets = await this.prisma.paperAnswerSheet.findMany({
      where: {
        paperExamId: examId,
        modelId: modelId,
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            photoUrl: true,
          },
        },
        model: {
          select: {
            id: true,
            modelCode: true,
            modelName: true,
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
              orderBy: {
                orderInModel: 'asc',
              },
            },
          },
        },
        paperExam: {
          select: {
            id: true,
            title: true,
            duration: true,
            trainingContent: {
              select: {
                name: true,
                code: true,
                program: {
                  select: {
                    nameAr: true,
                  },
                },
                classroom: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',  // ← ترتيب حسب وقت الإنشاء (يحافظ على ترتيب المجموعات!)
      },
    });

    return sheets;
  }

  /**
   * الحصول على أوراق الإجابة مرتبة حسب المجموعات واللجان
   */
  async getGroupsSheets(examId: number) {
    // جلب جميع أوراق الإجابة للاختبار
    const sheets = await this.prisma.paperAnswerSheet.findMany({
      where: {
        paperExamId: examId,
      },
      include: {
        trainee: true,
        model: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
              orderBy: {
                orderInModel: 'asc',
              },
            },
          },
        },
        paperExam: {
          include: {
            trainingContent: {
              include: {
                program: true,
              },
            },
          },
        },
      },
    });

    // تصنيف الأوراق حسب المجموعات واللجان
    const groupsMap = new Map<string, any>();

    for (const sheet of sheets) {
      try {
        const qrData = JSON.parse(sheet.qrCodeData || '{}');
        const groupId = qrData.groupId;
        const committeeNumber = qrData.committeeNumber || 0;
        const roomName = qrData.roomName || 'مجموعة غير معروفة';

        if (!groupId) continue; // تخطي الأوراق بدون groupId

        if (!groupsMap.has(groupId)) {
          groupsMap.set(groupId, {
            groupId,
            groupName: roomName,
            committees: new Map<number, any[]>(),
          });
        }

        const group = groupsMap.get(groupId);
        if (!group.committees.has(committeeNumber)) {
          group.committees.set(committeeNumber, []);
        }

        group.committees.get(committeeNumber).push({
          ...sheet,
          committeeNumber,
        });
      } catch (error) {
        console.error('خطأ في قراءة QR Code:', error);
      }
    }

    // تحويل إلى مصفوفة مرتبة
    const groups = Array.from(groupsMap.values()).map(group => ({
      groupId: group.groupId,
      groupName: group.groupName,
      committees: Array.from(group.committees.entries())
        .sort(([a], [b]) => a - b)
        .map(([committeeNumber, sheets]) => ({
          committeeNumber,
          sheetsCount: sheets.length,
          sheets: sheets.sort((a, b) => a.trainee.nameAr.localeCompare(b.trainee.nameAr, 'ar')),
        })),
    }));

    console.log(`📊 تم تصنيف ${sheets.length} ورقة إلى ${groups.length} مجموعات`);

    return {
      totalSheets: sheets.length,
      groupsCount: groups.length,
      groups,
    };
  }

  /**
   * الحصول على أوراق الإجابة مرتبة حسب اللجان والمجموعات
   */
  async getCommitteesSheets(examId: number) {
    // جلب جميع أوراق الإجابة للاختبار
    const sheets = await this.prisma.paperAnswerSheet.findMany({
      where: {
        paperExamId: examId,
      },
      include: {
        trainee: true,
        model: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
              orderBy: {
                orderInModel: 'asc',
              },
            },
          },
        },
        paperExam: {
          include: {
            trainingContent: {
              include: {
                program: true,
              },
            },
          },
        },
      },
    });

    // تصنيف الأوراق حسب المجموعة ثم اللجنة
    const groupsMap = new Map<string, any>();

    for (const sheet of sheets) {
      try {
        const qrData = JSON.parse(sheet.qrCodeData || '{}');
        const committeeNumber = qrData.committeeNumber || 0;
        const roomName = qrData.roomName || 'مجموعة غير معروفة';

        // إنشاء مفتاح فريد للمجموعة
        const groupKey = roomName;

        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, {
            groupName: roomName,
            committees: new Map<number, any[]>(),
          });
        }

        const group = groupsMap.get(groupKey);
        if (!group.committees.has(committeeNumber)) {
          group.committees.set(committeeNumber, []);
        }

        group.committees.get(committeeNumber).push({
          ...sheet,
          committeeNumber,
        });
      } catch (error) {
        console.error('خطأ في قراءة QR Code:', error);
      }
    }

    // تحويل إلى مصفوفة مرتبة
    const groups = Array.from(groupsMap.values()).map(group => ({
      groupName: group.groupName,
      committees: Array.from(group.committees.entries())
        .sort(([a], [b]) => a - b)
        .map(([committeeNumber, sheets]) => ({
          committeeNumber,
          sheetsCount: sheets.length,
          sheets: sheets, // الحفاظ على ترتيب قاعدة البيانات (ترتيب الإنشاء)
        })),
    }));

    console.log(`📊 تم تصنيف ${sheets.length} ورقة إلى ${groups.length} مجموعات`);

    return {
      totalSheets: sheets.length,
      groupsCount: groups.length,
      groups,
    };
  }

  /**
   * الحصول على نموذج أسئلة محدد
   */
  async getModel(modelId: number) {
    const model = await this.prisma.paperExamModel.findUnique({
      where: { id: modelId },
      include: {
        paperExam: {
          include: {
            trainingContent: {
              include: {
                program: true,
                classroom: true,
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
            orderInModel: 'asc',
          },
        },
      },
    });

    if (!model) {
      throw new NotFoundException('النموذج غير موجود');
    }

    return model;
  }

  /**
   * تحديث درجات المتدرب بناءً على نتيجة الاختبار الورقي
   */
  private async updateTraineeGrades(
    traineeId: number,
    contentId: number,
    gradeType: string,
    score: number,
  ) {
    try {
      // جلب معلومات المادة والفصل
      const content = await this.prisma.trainingContent.findUnique({
        where: { id: contentId },
        select: {
          classroomId: true,
        },
      });

      if (!content) return;

      // تحديد الحقل المطلوب تحديثه
      const gradeField = this.getGradeFieldName(gradeType);

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
          [gradeField]: score,
          yearWorkMarks: gradeType === 'YEAR_WORK' ? score : 0,
          practicalMarks: gradeType === 'PRACTICAL' ? score : 0,
          writtenMarks: gradeType === 'WRITTEN' ? score : 0,
          finalExamMarks: gradeType === 'FINAL_EXAM' ? score : 0,
          attendanceMarks: 0,
          quizzesMarks: 0,
          totalMarks: score,
        },
        update: {
          [gradeField]: score,
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
      console.error('Error updating trainee grades:', error);
      // لا نرمي الخطأ لأن التصحيح نجح
    }
  }

  /**
   * تحويل نوع الدرجة إلى اسم الحقل
   */
  private getGradeFieldName(gradeType: string): string {
    switch (gradeType) {
      case 'YEAR_WORK':
        return 'yearWorkMarks';
      case 'PRACTICAL':
        return 'practicalMarks';
      case 'WRITTEN':
        return 'writtenMarks';
      case 'FINAL_EXAM':
        return 'finalExamMarks';
      default:
        return 'yearWorkMarks';
    }
  }

  /**
   * الحصول على جميع الاختبارات الورقية
   */
  async findAll(contentId?: number) {
    const where: any = {};

    if (contentId) {
      where.trainingContentId = contentId;
    }

    return this.prisma.paperExam.findMany({
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
              },
            },
          },
        },
        _count: {
          select: {
            models: true,
            answerSheets: true,
          },
        },
      },
      orderBy: {
        examDate: 'desc',
      },
    });
  }

  /**
   * الحصول على اختبار ورقي محدد
   */
  async findOne(id: number) {
    const paperExam = await this.prisma.paperExam.findUnique({
      where: { id },
      include: {
        trainingContent: {
          include: {
            program: true,
            classroom: true,
            instructor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        models: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
              orderBy: {
                orderInModel: 'asc',
              },
            },
            _count: {
              select: {
                answerSheets: true,
              },
            },
          },
        },
        _count: {
          select: {
            answerSheets: true,
          },
        },
      },
    });

    if (!paperExam) {
      throw new NotFoundException('الاختبار الورقي غير موجود');
    }

    return paperExam;
  }

  /**
   * تحديث اختبار ورقي
   */
  async update(id: number, updateDto: UpdatePaperExamDto) {
    const paperExam = await this.findOne(id);

    // منع التعديل إذا كانت هناك أوراق إجابة تم تصحيحها
    if (paperExam._count.answerSheets > 0) {
      const gradedSheets = await this.prisma.paperAnswerSheet.count({
        where: {
          paperExamId: id,
          status: { in: ['GRADED', 'VERIFIED'] },
        },
      });

      if (gradedSheets > 0) {
        throw new BadRequestException('لا يمكن تعديل الاختبار لوجود أوراق إجابة تم تصحيحها');
      }
    }

    return this.prisma.paperExam.update({
      where: { id },
      data: {
        ...updateDto,
        examDate: updateDto.examDate ? new Date(updateDto.examDate) : undefined,
      },
      include: {
        trainingContent: {
          include: {
            program: true,
            classroom: true,
          },
        },
      },
    });
  }

  /**
   * حذف اختبار ورقي مع كل ما يتعلق به
   */
  async remove(id: number) {
    const paperExam = await this.prisma.paperExam.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            answerSheets: true,
            models: true,
          },
        },
      },
    });

    if (!paperExam) {
      throw new NotFoundException('الاختبار الورقي غير موجود');
    }

    // حذف كل شيء في transaction واحدة
    await this.prisma.$transaction(async (tx) => {
      // حذف إجابات الأوراق
      await tx.paperAnswerSheetAnswer.deleteMany({
        where: {
          answerSheet: {
            paperExamId: id,
          },
        },
      });

      // حذف أوراق الإجابة
      await tx.paperAnswerSheet.deleteMany({
        where: { paperExamId: id },
      });

      // حذف أسئلة النماذج
      await tx.paperExamQuestion.deleteMany({
        where: {
          model: {
            paperExamId: id,
          },
        },
      });

      // حذف النماذج
      await tx.paperExamModel.deleteMany({
        where: { paperExamId: id },
      });

      // حذف الاختبار نفسه
      await tx.paperExam.delete({
        where: { id },
      });
    });

    return {
      message: 'تم حذف الاختبار بنجاح مع جميع النماذج والأوراق المرتبطة',
      deletedCount: {
        models: paperExam._count.models,
        answerSheets: paperExam._count.answerSheets,
      }
    };
  }

  /**
   * الحصول على ورقة إجابة بالكود
   */
  async getAnswerSheetByCode(sheetCode: string) {
    // محاولة البحث بكود الورقة أولاً
    let answerSheet = await this.prisma.paperAnswerSheet.findUnique({
      where: { sheetCode },
      include: {
        paperExam: {
          select: {
            id: true,
            title: true,
            trainingContent: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        model: {
          select: {
            id: true,
            modelCode: true,
            modelName: true,
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
              orderBy: {
                orderInModel: 'asc',
              },
            },
          },
        },
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nationalId: true,
            photoUrl: true,
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

    // إذا لم تُعثر، حاول البحث بالرقم القومي
    if (!answerSheet) {
      answerSheet = await this.prisma.paperAnswerSheet.findFirst({
        where: {
          trainee: {
            nationalId: sheetCode, // البحث بالرقم القومي
          },
        },
        include: {
          paperExam: {
            select: {
              id: true,
              title: true,
              trainingContent: {
                select: {
                  name: true,
                  code: true,
                },
              },
            },
          },
          model: {
            select: {
              id: true,
              modelCode: true,
              modelName: true,
              questions: {
                include: {
                  question: {
                    include: {
                      options: true,
                    },
                  },
                },
                orderBy: {
                  orderInModel: 'asc',
                },
              },
            },
          },
          trainee: {
            select: {
              id: true,
              nameAr: true,
              nationalId: true,
              photoUrl: true,
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
        orderBy: {
          createdAt: 'desc', // أحدث ورقة للطالب
        },
      });
    }

    if (!answerSheet) {
      throw new NotFoundException(`ورقة الإجابة برمز "${sheetCode}" أو رقم قومي "${sheetCode}" غير موجودة`);
    }

    return answerSheet;
  }

  /**
   * الحصول على تقرير الاختبار
   */
  async getExamReport(id: number) {
    const paperExam = await this.prisma.paperExam.findUnique({
      where: { id },
      include: {
        trainingContent: {
          include: {
            program: true,
            classroom: true,
          },
        },
        answerSheets: {
          where: {
            status: { in: ['GRADED', 'VERIFIED'] },
          },
          include: {
            trainee: {
              select: {
                id: true,
                nameAr: true,
                nationalId: true,
              },
            },
            model: {
              select: {
                modelCode: true,
                modelName: true,
              },
            },
          },
          orderBy: {
            percentage: 'desc',
          },
        },
      },
    });

    if (!paperExam) {
      throw new NotFoundException('الاختبار الورقي غير موجود');
    }

    // المتدربون الذين لم يؤدوا الاختبار (أوراقهم مولدة لكن لم تُصحح)
    const notGradedSheets = await this.prisma.paperAnswerSheet.findMany({
      where: {
        paperExamId: id,
        status: 'NOT_SUBMITTED',
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
    });

    const traineesWhoDidNotTake = notGradedSheets.map(sheet => sheet.trainee);

    return {
      paperExam,
      answerSheets: paperExam.answerSheets,
      traineesWhoDidNotTake,
      stats: {
        total: paperExam.answerSheets.length,
        passed: paperExam.answerSheets.filter(s => s.passed).length,
        failed: paperExam.answerSheets.filter(s => !s.passed).length,
        averageScore: paperExam.answerSheets.length > 0
          ? paperExam.answerSheets.reduce((sum, s) => sum + s.score, 0) / paperExam.answerSheets.length
          : 0,
        averagePercentage: paperExam.answerSheets.length > 0
          ? paperExam.answerSheets.reduce((sum, s) => sum + s.percentage, 0) / paperExam.answerSheets.length
          : 0,
      },
    };
  }

  /**
   * البحث عن طلاب في اختبار
   */
  async searchStudents(examId: number, query: string) {
    const exam = await this.prisma.paperExam.findUnique({
      where: { id: examId },
      include: {
        trainingContent: {
          include: {
            classroom: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    const students = await this.prisma.trainee.findMany({
      where: {
        programId: exam.trainingContent.classroom.programId,
        OR: [
          { nameAr: { contains: query } },
          { nationalId: { contains: query } },
        ],
      },
      select: {
        id: true,
        nameAr: true,
        nationalId: true,
      },
      take: 10,
    });

    const sheets = await this.prisma.paperAnswerSheet.findMany({
      where: {
        paperExamId: examId,
        traineeId: { in: students.map(s => s.id) },
      },
      select: {
        id: true,
        sheetCode: true,
        traineeId: true,
        status: true,
      },
    });

    return students.map(student => ({
      ...student,
      sheetCode: sheets.find(s => s.traineeId === student.id)?.sheetCode,
      status: sheets.find(s => s.traineeId === student.id)?.status,
    }));
  }

  /**
   * حذف نموذج أسئلة
   */
  async deleteModel(modelId: number) {
    const model = await this.prisma.paperExamModel.findUnique({
      where: { id: modelId },
      include: {
        _count: {
          select: {
            answerSheets: true,
          },
        },
      },
    });

    if (!model) {
      throw new NotFoundException('النموذج غير موجود');
    }

    // منع الحذف إذا كانت هناك أوراق إجابة
    if (model._count.answerSheets > 0) {
      throw new BadRequestException('لا يمكن حذف النموذج لوجود أوراق إجابة مرتبطة به');
    }

    await this.prisma.paperExamModel.delete({
      where: { id: modelId },
    });

    return { message: 'تم حذف النموذج بنجاح' };
  }

  /**
   * توليد ملف Excel بقائمة المتدربين لإدخال الدرجات
   */
  async generateGradesExcelTemplate(examId: number): Promise<Buffer> {
    // جلب الاختبار مع المتدربين
    const paperExam = await this.prisma.paperExam.findUnique({
      where: { id: examId },
      include: {
        trainingContent: {
          include: {
            classroom: {
              include: {
                program: true,
              },
            },
          },
        },
        answerSheets: {
          include: {
            trainee: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
                nationalId: true,
              },
            },
            model: {
              select: {
                modelCode: true,
                modelName: true,
              },
            },
          },
          orderBy: {
            trainee: {
              nameAr: 'asc',
            },
          },
        },
      },
    });

    if (!paperExam) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    // إنشاء ملف Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('درجات الاختبار');

    // تنسيق العناوين
    worksheet.columns = [
      { header: 'م', key: 'index', width: 8 },
      { header: 'رقم المتدرب', key: 'traineeId', width: 15 },
      { header: 'الاسم', key: 'name', width: 35 },
      { header: 'الهوية الوطنية', key: 'nationalId', width: 18 },
      { header: 'النموذج', key: 'model', width: 12 },
      { header: `الدرجة (من ${paperExam.totalMarks})`, key: 'score', width: 20 },
    ];

    // تنسيق صف العناوين
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // إضافة صف معلومات الاختبار
    worksheet.insertRow(1, [
      'اختبار:',
      paperExam.title,
      '',
      'إجمالي الدرجات:',
      paperExam.totalMarks,
    ]);
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FF2E75B6' } };

    // إضافة صف فارغ
    worksheet.insertRow(2, []);

    // إضافة بيانات المتدربين
    paperExam.answerSheets.forEach((sheet, index) => {
      worksheet.addRow({
        index: index + 1,
        traineeId: sheet.traineeId,
        name: sheet.trainee.nameAr,
        nationalId: sheet.trainee.nationalId,
        model: sheet.model.modelCode,
        score: sheet.score || '', // فارغ لإدخال الدرجة
      });
    });

    // تنسيق الخلايا
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 3) {
        row.alignment = { horizontal: 'center', vertical: 'middle' };
        row.height = 20;

        // حماية الخلايا (ما عدا عمود الدرجة)
        row.eachCell((cell, colNumber) => {
          if (colNumber !== 6) {
            // كل الأعمدة محمية إلا عمود الدرجة
            cell.protection = { locked: true };
          } else {
            cell.protection = { locked: false };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' },
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          }
        });
      }
    });

    // حماية الورقة (السماح بتعديل الخلايا غير المحمية فقط)
    await worksheet.protect('', {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      formatColumns: false,
      formatRows: false,
      insertRows: false,
      insertColumns: false,
      deleteRows: false,
      deleteColumns: false,
      sort: false,
      autoFilter: false,
    });

    // تصدير كـ Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * معالجة ملف Excel المرفوع وإدخال الدرجات تلقائياً
   */
  async processGradesExcel(
    examId: number,
    fileBuffer: Buffer,
    userId: string,
  ): Promise<any> {
    // قراءة ملف Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer.buffer as ArrayBuffer);

    const worksheet = workbook.getWorksheet('درجات الاختبار');
    if (!worksheet) {
      throw new BadRequestException('ملف Excel غير صحيح - الورقة المطلوبة غير موجودة');
    }

    // جلب الاختبار
    const paperExam = await this.prisma.paperExam.findUnique({
      where: { id: examId },
      include: {
        trainingContent: true,
        answerSheets: {
          include: {
            trainee: true,
          },
        },
      },
    });

    if (!paperExam) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    // معالجة الصفوف (بدءاً من الصف 4 - بعد العناوين)
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 3) {
        rows.push({
          rowNumber,
          traineeId: row.getCell(2).value,
          name: row.getCell(3).value,
          score: row.getCell(6).value,
        });
      }
    });

    // معالجة كل صف
    for (const rowData of rows) {
      try {
        const traineeId = parseInt(String(rowData.traineeId));
        const score = parseFloat(String(rowData.score || '0'));

        if (isNaN(traineeId) || isNaN(score)) {
          results.failed++;
          results.errors.push({
            row: rowData.rowNumber,
            trainee: rowData.name,
            error: 'بيانات غير صحيحة',
          });
          continue;
        }

        // التحقق من الدرجة
        if (score < 0 || score > paperExam.totalMarks) {
          results.failed++;
          results.errors.push({
            row: rowData.rowNumber,
            trainee: rowData.name,
            error: `الدرجة يجب أن تكون بين 0 و ${paperExam.totalMarks}`,
          });
          continue;
        }

        // البحث عن ورقة الإجابة
        const answerSheet = paperExam.answerSheets.find(
          (sheet) => sheet.traineeId === traineeId,
        );

        if (!answerSheet) {
          results.failed++;
          results.errors.push({
            row: rowData.rowNumber,
            trainee: rowData.name,
            error: 'ورقة الإجابة غير موجودة',
          });
          continue;
        }

        // حساب النسبة المئوية
        const percentage = (score / paperExam.totalMarks) * 100;
        const passed = percentage >= paperExam.passingScore;

        // تحديث ورقة الإجابة
        await this.prisma.paperAnswerSheet.update({
          where: { id: answerSheet.id },
          data: {
            status: 'GRADED',
            score,
            percentage,
            passed,
            gradedAt: new Date(),
            gradedBy: userId,
            notes: 'تم إدخال الدرجة من خلال ملف Excel',
          },
        });

        // تحديث جدول الدرجات الرئيسي
        await this.updateTraineeGrades(
          traineeId,
          paperExam.trainingContentId,
          paperExam.gradeType,
          score,
        );

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowData.rowNumber,
          trainee: rowData.name,
          error: error.message || 'خطأ غير معروف',
        });
      }
    }

    return {
      message: `تم معالجة ${results.success + results.failed} متدرب`,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
    };
  }

  // ========== Batch Grading Methods ==========
  
  async createBatchGradingSession(examId: number, fileName: string, filePath: string, totalPages: number, userId: string) {
    return this.batchGradingService.createSession(examId, fileName, filePath, totalPages, userId);
  }

  async updateBatchGradingSession(sessionId: string, data: any) {
    return this.batchGradingService.updateSession(sessionId, data);
  }

  async getBatchGradingSessions(examId: number) {
    return this.batchGradingService.getSessions(examId);
  }

  async getBatchGradingSessionDetails(sessionId: string) {
    return this.batchGradingService.getSessionDetails(sessionId);
  }

  async deleteBatchGradingSession(sessionId: string) {
    return this.batchGradingService.deleteSession(sessionId);
  }

  async addBatchGradingResult(sessionId: string, resultData: any) {
    return this.batchGradingService.addResult(sessionId, resultData);
  }

  async addBatchGradingSkipped(sessionId: string, skippedData: any) {
    return this.batchGradingService.addSkipped(sessionId, skippedData);
  }

  async addBatchGradingAlreadyGraded(sessionId: string, alreadyGradedData: any) {
    return this.batchGradingService.addAlreadyGraded(sessionId, alreadyGradedData);
  }

  async addBatchGradingFailure(sessionId: string, failureData: any) {
    return this.batchGradingService.addFailure(sessionId, failureData);
  }
}