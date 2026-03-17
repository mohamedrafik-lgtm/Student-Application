import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTraineeDto } from './dto/create-trainee.dto';
import { UpdateTraineeDto } from './dto/update-trainee.dto';
import { CreateTraineeDocumentDto, UpdateTraineeDocumentDto, DocumentType } from './dto/create-trainee-document.dto';
import { AuditService } from '../audit/audit.service';
import { FinancesService } from '../finances/finances.service';
import { FinancialAuditService, AuditContext } from '../finances/financial-audit.service';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';
import { AuditAction, TraineeStatus, Year } from '@prisma/client';
import { TransactionType } from '../finances/dto/create-transaction.dto';
import { toJsonValue } from '../lib/utils';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TraineesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private financialAuditService: FinancialAuditService,
    @Inject(forwardRef(() => FinancesService))
    private financesService: FinancesService,
    @Inject(forwardRef(() => UnifiedWhatsAppService))
    private whatsappService: UnifiedWhatsAppService,
  ) {}

  private getCurrentAcademicYear(): string {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    // If we're past July, use the current year and next year, otherwise use previous year and current year
    const startYear = currentDate.getMonth() >= 7 ? currentYear : currentYear - 1;
    const endYear = startYear + 1;
    return `${startYear}/${endYear}`;
  }

  // التحقق من عدم تكرار البيانات الحساسة
  private async validateUniqueFields(createTraineeDto: CreateTraineeDto) {
    const errors = [];

    // التحقق من الرقم القومي
    if (createTraineeDto.nationalId) {
      const existingTraineeByNationalId = await this.prisma.trainee.findFirst({
        where: { nationalId: createTraineeDto.nationalId },
        select: { id: true, nameAr: true, nationalId: true }
      });
      
      if (existingTraineeByNationalId) {
        errors.push({
          field: 'nationalId',
          message: `الرقم القومي ${createTraineeDto.nationalId} مسجل مسبقاً للمتدرب: ${existingTraineeByNationalId.nameAr}`,
          existingTrainee: existingTraineeByNationalId.nameAr
        });
      }
    }

    // التحقق من رقم الهاتف
    if (createTraineeDto.phone) {
      const existingTraineeByPhone = await this.prisma.trainee.findFirst({
        where: { phone: createTraineeDto.phone },
        select: { id: true, nameAr: true, phone: true }
      });
      
      if (existingTraineeByPhone) {
        errors.push({
          field: 'phone',
          message: `رقم الهاتف ${createTraineeDto.phone} مسجل مسبقاً للمتدرب: ${existingTraineeByPhone.nameAr}`,
          existingTrainee: existingTraineeByPhone.nameAr
        });
      }
    }

    // التحقق من البريد الإلكتروني (إذا كان موجود)
    if (createTraineeDto.email && createTraineeDto.email.trim() !== '') {
      const existingTraineeByEmail = await this.prisma.trainee.findFirst({
        where: { email: createTraineeDto.email },
        select: { id: true, nameAr: true, email: true }
      });
      
      if (existingTraineeByEmail) {
        errors.push({
          field: 'email',
          message: `البريد الإلكتروني ${createTraineeDto.email} مسجل مسبقاً للمتدرب: ${existingTraineeByEmail.nameAr}`,
          existingTrainee: existingTraineeByEmail.nameAr
        });
      }
    }

    // السماح بتكرار رقم هاتف ولي الأمر
    // تم إزالة التحقق من تكرار رقم هاتف ولي الأمر للسماح بتسجيل أكثر من متدرب لنفس ولي الأمر

    // التحقق من اسم ولي الأمر (يجب أن يكون فريد إذا أردنا ذلك)
    // يمكن إزالة هذا التحقق إذا كنا نريد السماح بأسماء متكررة لأولياء الأمور
    // if (createTraineeDto.guardianName && createTraineeDto.guardianName.trim() !== '') {
    //   const existingTraineeByGuardianName = await this.prisma.trainee.findFirst({
    //     where: { guardianName: createTraineeDto.guardianName },
    //     select: { id: true, nameAr: true, guardianName: true }
    //   });
    //   
    //   if (existingTraineeByGuardianName) {
    //     errors.push({
    //       field: 'guardianName',
    //       message: `اسم ولي الأمر ${createTraineeDto.guardianName} مسجل مسبقاً للمتدرب: ${existingTraineeByGuardianName.nameAr}`,
    //       existingTrainee: existingTraineeByGuardianName.nameAr
    //     });
    //   }
    // }

    // إذا كان هناك أخطاء، ارمي استثناء مع تفاصيل واضحة
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'توجد بيانات مكررة لا يمكن تسجيلها مرة أخرى',
        errors: errors,
        duplicateFields: errors.map(e => e.field)
      });
    }
  }

  async create(createTraineeDto: CreateTraineeDto, userId: string) {
    // التحقق من عدم تكرار البيانات الحساسة
    await this.validateUniqueFields(createTraineeDto);

    // تحويل التواريخ من string إلى Date
    const processedDto = { ...createTraineeDto };
    if (typeof processedDto.birthDate === 'string') {
      processedDto.birthDate = new Date(processedDto.birthDate) as any;
    }
    if (typeof processedDto.idIssueDate === 'string') {
      processedDto.idIssueDate = new Date(processedDto.idIssueDate) as any;
    }
    if (typeof processedDto.idExpiryDate === 'string') {
      processedDto.idExpiryDate = new Date(processedDto.idExpiryDate) as any;
    }
    if (typeof processedDto.graduationDate === 'string') {
      processedDto.graduationDate = new Date(processedDto.graduationDate) as any;
    }

    // Set default values for classLevel, traineeStatus and academicYear if not provided
    const data = {
      ...processedDto,
      traineeStatus: processedDto.traineeStatus || TraineeStatus.NEW,
      classLevel: processedDto.classLevel || Year.FIRST,
      academicYear: processedDto.academicYear || this.getCurrentAcademicYear(),
      createdById: userId, // حفظ من أنشأ المتدرب
      updatedById: userId  // تعيين updatedById أيضاً عند الإنشاء
    };

    const trainee = await this.prisma.trainee.create({
      data: data as any,
    });

    // حفظ سجل الإنشاء
    await this.prisma.traineeEditHistory.create({
      data: {
        traineeId: trainee.id,
        userId,
        action: 'CREATE',
        changes: toJsonValue({
          action: 'إنشاء متدرب جديد',
          traineeName: trainee.nameAr,
          data: createTraineeDto
        })
      }
    });

    await this.auditService.log({
      action: AuditAction.CREATE,
      entity: 'Trainee',
      entityId: String(trainee.id),
      userId,
      details: { message: `Created trainee ${trainee.nameAr}` },
    });

    // تطبيق الرسوم التلقائي على المتدرب الجديد مع آلية إعادة المحاولة
    await this.applyFeesWithRetry(trainee, userId);

    // إرسال رسالة ترحيب واتساب تلقائية للمتدرب الجديد
    try {
      const traineeWithProgram = await this.prisma.trainee.findUnique({
        where: { id: trainee.id },
        include: { program: true }
      });
      
      if (traineeWithProgram?.phone) {
        const welcomeMessageSent = await this.whatsappService.sendWelcomeMessage(traineeWithProgram);
        
        await this.auditService.log({
          action: AuditAction.CREATE,
          entity: 'WhatsApp',
          entityId: String(trainee.id),
          userId,
          details: {
            message: welcomeMessageSent 
              ? `Welcome WhatsApp message sent to ${trainee.nameAr}` 
              : `Failed to send WhatsApp welcome message to ${trainee.nameAr}`,
            phoneNumber: traineeWithProgram.phone,
            messageType: 'WELCOME'
          },
        });
      }
    } catch (error) {
      // تسجيل خطأ في إرسال رسالة واتساب ولكن لا نفشل إنشاء المتدرب
      console.error('Error sending WhatsApp welcome message:', error);
      await this.auditService.log({
        action: AuditAction.CREATE,
        entity: 'Trainee',
        entityId: String(trainee.id),
        userId,
        details: {
          message: `Failed to send WhatsApp welcome message to new trainee ${trainee.nameAr}`,
          error: error.message
        },
      });
    }

    // إنشاء حساب تلقائي على منصة المتدربين وإرسال بيانات الدخول
    try {
      const existingAuth = await this.prisma.traineeAuth.findUnique({
        where: { traineeId: trainee.id },
      });

      if (!existingAuth) {
        const hashedPassword = await bcrypt.hash(trainee.nationalId, 10);
        await this.prisma.traineeAuth.create({
          data: {
            nationalId: trainee.nationalId,
            birthDate: trainee.birthDate,
            password: hashedPassword,
            traineeId: trainee.id,
            isActive: true,
          },
        });

        // إرسال بيانات الدخول عبر واتساب
        if (trainee.phone) {
          const traineeWithProgram = await this.prisma.trainee.findUnique({
            where: { id: trainee.id },
            include: { program: true },
          });
          await this.whatsappService.sendPlatformCredentials(traineeWithProgram);
        }

        await this.auditService.log({
          action: AuditAction.CREATE,
          entity: 'TraineeAuth',
          entityId: String(trainee.id),
          userId,
          details: {
            message: `Auto-created trainee platform account for ${trainee.nameAr}`,
          },
        });
      }
    } catch (error) {
      console.error('Error auto-creating trainee platform account:', error);
      await this.auditService.log({
        action: AuditAction.CREATE,
        entity: 'TraineeAuth',
        entityId: String(trainee.id),
        userId,
        details: {
          message: `Failed to auto-create trainee platform account for ${trainee.nameAr}`,
          error: error.message,
        },
      });
    }

    return trainee;
  }

  /**
   * تطبيق الرسوم مع آلية إعادة المحاولة المحسنة
   * يضمن تطبيق جميع الرسوم أو عدم تطبيق أي منها
   */
  private async applyFeesWithRetry(trainee: any, userId: string, maxRetries = 3) {
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      attempt++;
      
      try {
        console.log(`🔄 [ApplyFeesRetry] محاولة ${attempt}/${maxRetries} لتطبيق الرسوم على المتدرب ${trainee.nameAr}`);
        
        const feesResult = await this.financesService.autoApplyFeesToNewTrainee(
          trainee.id,
          trainee.programId,
          userId
        );

        // نجحت العملية - تسجيل النتيجة في سجل المراجعة
        if (feesResult.appliedFeesCount > 0) {
          await this.auditService.log({
            action: AuditAction.CREATE,
            entity: 'TraineePayment',
            entityId: String(trainee.id),
            userId,
            details: { 
              message: `Auto-applied ${feesResult.appliedFeesCount} tuition fees to new trainee ${trainee.nameAr} (attempt ${attempt}/${maxRetries})`,
              totalAmount: feesResult.totalAppliedAmount,
              appliedFees: feesResult.results.filter(r => r.status === 'applied'),
              atomicOperation: feesResult.atomicOperation || false,
              success: true
            },
          });
        } else if (feesResult.alreadyAppliedCount > 0) {
          // جميع الرسوم مطبقة مسبقاً
          await this.auditService.log({
            action: AuditAction.CREATE,
            entity: 'TraineePayment',
            entityId: String(trainee.id),
            userId,
            details: { 
              message: `All ${feesResult.alreadyAppliedCount} tuition fees already applied to trainee ${trainee.nameAr}`,
              alreadyApplied: true
            },
          });
        }

        console.log(`✅ [ApplyFeesRetry] نجح تطبيق الرسوم على المتدرب ${trainee.nameAr} في المحاولة ${attempt}`);
        return feesResult; // نجح - خروج من الحلقة
        
      } catch (error) {
        lastError = error;
        console.error(`❌ [ApplyFeesRetry] فشل تطبيق الرسوم في المحاولة ${attempt}/${maxRetries}:`, error.message);

        // التحقق من نوع الخطأ
        if (this.isRetryableError(error)) {
          if (attempt < maxRetries) {
            // انتظار متزايد قبل إعادة المحاولة (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // max 5 seconds
            console.log(`⏳ [ApplyFeesRetry] انتظار ${waitTime}ms قبل المحاولة التالية...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        } else {
          // خطأ غير قابل للإعادة - توقف فوراً
          console.error(`🚫 [ApplyFeesRetry] خطأ غير قابل للإعادة - توقف المحاولات`);
          break;
        }
      }
    }

    // فشل في جميع المحاولات - تسجيل الفشل النهائي
    console.error(`💥 [ApplyFeesRetry] فشل نهائي في تطبيق الرسوم على المتدرب ${trainee.nameAr} بعد ${maxRetries} محاولات`);
    
    await this.auditService.log({
      action: AuditAction.CREATE,
      entity: 'Trainee',
      entityId: String(trainee.id),
      userId,
      details: { 
        message: `Failed to auto-apply fees to new trainee ${trainee.nameAr} after ${maxRetries} attempts`,
        error: lastError?.message || 'Unknown error',
        attempts: maxRetries,
        finalFailure: true,
        errorType: lastError?.constructor?.name || 'Unknown'
      },
    });

    // لا نرمي خطأ هنا لأننا لا نريد فشل إنشاء المتدرب
    // ولكن نسجل تحذيراً
    console.warn(`⚠️ [ApplyFeesRetry] تم إنشاء المتدرب ${trainee.nameAr} ولكن فشل تطبيق الرسوم - يجب تطبيقها يدوياً`);
  }

  /**
   * تحديد ما إذا كان الخطأ قابل لإعادة المحاولة أم لا
   */
  private isRetryableError(error: any): boolean {
    // أخطاء الشبكة ومهلة الاتصال
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return true;
    }

    // أخطاء قاعدة البيانات القابلة للإعادة
    if (error.code === 'P2034' || // Transaction conflict
        error.code === 'P2024' || // Timed out fetching a new connection from the connection pool
        error.code === 'P1008' || // Operations timed out
        error.message?.includes('timeout') ||
        error.message?.includes('connection') ||
        error.message?.includes('deadlock')) {
      return true;
    }

    // أخطاء HTTP مؤقتة
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // أخطاء عدم توفر الخدمة
    if (error.message?.includes('Service Unavailable') || 
        error.message?.includes('Too Many Requests')) {
      return true;
    }

    return false;
  }

  async findAll(includeDetails = false, filters?: {
    programId?: number | { in: number[] };
    classroomId?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    console.log('🔍 TraineesService.findAll called with filters:', filters);
    
    const where: any = {};

    // تصفية حسب البرنامج
    if (filters?.programId) {
      where.programId = filters.programId;
      console.log('📚 تصفية حسب البرنامج:', filters.programId);
    }

    // تصفية حسب الفصل - نستخدم grades لإيجاد الطلاب المرتبطين بالفصل
    if (filters?.classroomId) {
      console.log('🏫 تصفية حسب الفصل:', filters.classroomId);
      
      // جلب IDs الطلاب الذين لديهم grades في مواد هذا الفصل
      const traineesWithGrades = await this.prisma.traineeGrades.findMany({
        where: {
          trainingContent: {
            classroomId: filters.classroomId
          }
        },
        select: {
          traineeId: true
        },
        distinct: ['traineeId']
      });
      
      const traineeIds = traineesWithGrades.map(g => g.traineeId);
      console.log(`📋 Found ${traineeIds.length} trainees with grades in this classroom`);
      
      // إذا لم يكن هناك طلاب بعد، نجلب جميع طلاب البرنامج
      // (لأن الطلاب قد لا يكون لديهم grades بعد)
      if (traineeIds.length === 0) {
        // جلب البرنامج من الفصل
        const classroom = await this.prisma.classroom.findUnique({
          where: { id: filters.classroomId },
          select: { programId: true }
        });
        
        if (classroom) {
          where.programId = classroom.programId;
          console.log('⚠️ No grades found, filtering by program:', classroom.programId);
        }
      } else {
        where.id = { in: traineeIds };
      }
    }

    // تصفية حسب الحالة
    if (filters?.status) {
      where.status = filters.status;
    }

    // تصفية حسب البحث (الاسم العربي أو الإنجليزي)
    if (filters?.search) {
      where.OR = [
        { nameAr: { contains: filters.search } },
        { nameEn: { contains: filters.search } },
        { nationalId: { contains: filters.search } },
        { phone: { contains: filters.search } },
      ];
    }

    console.log('🔎 Prisma where clause:', JSON.stringify(where, null, 2));

    // إعداد الترتيب
    const getOrderBy = () => {
      const sortBy = filters?.sortBy || 'name'; // افتراضي: الترتيب الأبجدي
      const sortOrder = filters?.sortOrder || 'asc'; // افتراضي: تصاعدي
      
      console.log('📊 Sorting by:', sortBy, 'Order:', sortOrder);
      
      if (sortBy === 'id') {
        // ترتيب رقمي لرقم الملف
        return {
          id: sortOrder as 'asc' | 'desc'
        };
      } else if (sortBy === 'name') {
        // ترتيب أبجدي للاسم العربي
        return {
          nameAr: sortOrder as 'asc' | 'desc'
        };
      } else {
        // افتراضي: الترتيب حسب تاريخ الإنشاء
        return {
          createdAt: 'desc' as 'asc' | 'desc'
        };
      }
    };

    const orderBy = getOrderBy();

    // إذا لم يتم تمرير page أو limit، إرجاع جميع البيانات (للتوافق مع الكود الحالي)
    if (!filters?.page && !filters?.limit) {
      return this.prisma.trainee.findMany({
        where,
        include: {
          program: true,
          ...(includeDetails && {
            attendanceRecords: {
              include: {
                session: true
              }
            }
          })
        },
        orderBy
      });
    }

    // إذا تم تمرير pagination parameters، استخدام pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    console.log(`📄 Pagination: page=${page}, limit=${limit}, skip=${skip}`);

    // جلب العدد الإجمالي للسجلات
    const totalCount = await this.prisma.trainee.count({ where });

    // جلب البيانات مع pagination
    const trainees = await this.prisma.trainee.findMany({
      where,
      include: {
        program: true,
        ...(includeDetails && {
          attendanceRecords: {
            include: {
              session: true
            }
          }
        })
      },
      orderBy,
      skip,
      take: limit
    });

    // إرجاع البيانات مع معلومات pagination
    return {
      data: trainees,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    };
  }

  async findOne(id: number) {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id },
      include: {
        program: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
    });

    if (!trainee) {
      throw new NotFoundException(`Trainee with ID ${id} not found`);
    }

    return trainee;
  }

  // التحقق من عدم تكرار البيانات الحساسة للتحديث (يستثني رقم هاتف ولي الأمر)
  private async validateUniqueFieldsForUpdate(updateTraineeDto: UpdateTraineeDto, currentTraineeId: number) {
    const errors = [];

    // التحقق من الرقم القومي (إذا تم تغييره)
    if (updateTraineeDto.nationalId) {
      const existingTraineeByNationalId = await this.prisma.trainee.findFirst({
        where: {
          nationalId: updateTraineeDto.nationalId,
          id: { not: currentTraineeId } // استثناء المتدرب الحالي
        },
        select: { id: true, nameAr: true, nationalId: true }
      });

      if (existingTraineeByNationalId) {
        errors.push({
          field: 'nationalId',
          message: `الرقم القومي ${updateTraineeDto.nationalId} مسجل مسبقاً للمتدرب: ${existingTraineeByNationalId.nameAr}`,
          existingTrainee: existingTraineeByNationalId.nameAr
        });
      }
    }

    // التحقق من رقم الهاتف (إذا تم تغييره)
    if (updateTraineeDto.phone) {
      const existingTraineeByPhone = await this.prisma.trainee.findFirst({
        where: {
          phone: updateTraineeDto.phone,
          id: { not: currentTraineeId } // استثناء المتدرب الحالي
        },
        select: { id: true, nameAr: true, phone: true }
      });

      if (existingTraineeByPhone) {
        errors.push({
          field: 'phone',
          message: `رقم الهاتف ${updateTraineeDto.phone} مسجل مسبقاً للمتدرب: ${existingTraineeByPhone.nameAr}`,
          existingTrainee: existingTraineeByPhone.nameAr
        });
      }
    }

    // التحقق من البريد الإلكتروني (إذا كان موجود وتم تغييره)
    if (updateTraineeDto.email && updateTraineeDto.email.trim() !== '') {
      const existingTraineeByEmail = await this.prisma.trainee.findFirst({
        where: {
          email: updateTraineeDto.email,
          id: { not: currentTraineeId } // استثناء المتدرب الحالي
        },
        select: { id: true, nameAr: true, email: true }
      });

      if (existingTraineeByEmail) {
        errors.push({
          field: 'email',
          message: `البريد الإلكتروني ${updateTraineeDto.email} مسجل مسبقاً للمتدرب: ${existingTraineeByEmail.nameAr}`,
          existingTrainee: existingTraineeByEmail.nameAr
        });
      }
    }

    // السماح بتكرار رقم هاتف ولي الأمر - لا نتحقق منه في التحديث

    if (errors.length > 0) {
      throw new ConflictException({
        message: 'يوجد تضارب في البيانات المدخلة',
        errors
      });
    }
  }

  async update(id: number, updateTraineeDto: UpdateTraineeDto, userId: string) {
    const before = await this.findOne(id);

    if (!before) {
      throw new NotFoundException(`Trainee with ID ${id} not found`);
    }

    // التحقق من عدم تكرار البيانات الحساسة (باستثناء رقم هاتف ولي الأمر)
    await this.validateUniqueFieldsForUpdate(updateTraineeDto, id);

    // تحويل التواريخ من string إلى Date
    const processedDto = { ...updateTraineeDto };
    
    const convertToDate = (dateStr: any): Date | undefined => {
      if (!dateStr) return undefined;
      if (dateStr instanceof Date) return dateStr;
      if (typeof dateStr === 'string') {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
        console.error('Invalid date string:', dateStr);
      }
      return undefined;
    };

    if (processedDto.birthDate) {
      processedDto.birthDate = convertToDate(processedDto.birthDate) as any;
    }
    if (processedDto.idIssueDate) {
      processedDto.idIssueDate = convertToDate(processedDto.idIssueDate) as any;
    }
    if (processedDto.idExpiryDate) {
      processedDto.idExpiryDate = convertToDate(processedDto.idExpiryDate) as any;
    }
    if (processedDto.graduationDate) {
      processedDto.graduationDate = convertToDate(processedDto.graduationDate) as any;
    }

    // إضافة updatedById للبيانات المراد تحديثها
    const dataToUpdate = {
      ...processedDto,
      updatedById: userId
    };

    const after = await this.prisma.trainee.update({
      where: { id },
      data: dataToUpdate as any,
    });

    // حساب التغييرات (مع معالجة خاصة للتواريخ)
    const changes: any = {};
    const dateFields = ['birthDate', 'idIssueDate', 'idExpiryDate', 'graduationDate'];
    
    Object.keys(updateTraineeDto).forEach((key) => {
      const oldValue = before[key];
      const newValue = updateTraineeDto[key];
      
      // معالجة خاصة لحقول التاريخ
      if (dateFields.includes(key)) {
        // تحويل كلا التاريخين إلى صيغة YYYY-MM-DD للمقارنة
        const formatDateForComparison = (date: any) => {
          if (!date) return null;
          try {
            if (date instanceof Date) {
              return date.toISOString().split('T')[0];
            }
            if (typeof date === 'string') {
              return new Date(date).toISOString().split('T')[0];
            }
            return null;
          } catch {
            return null;
          }
        };
        
        const oldDateStr = formatDateForComparison(oldValue);
        const newDateStr = formatDateForComparison(newValue);
        
        if (oldDateStr !== newDateStr) {
          changes[key] = {
            before: oldValue,
            after: newValue
          };
        }
      } else {
        // للحقول الأخرى، مقارنة عادية
        if (oldValue !== newValue) {
          changes[key] = {
            before: oldValue,
            after: newValue
          };
        }
      }
    });

    // حفظ سجل التعديل فقط إذا كان هناك تغييرات فعلية
    if (Object.keys(changes).length > 0) {
      await this.prisma.traineeEditHistory.create({
        data: {
          traineeId: id,
          userId,
          action: 'UPDATE',
          changes: toJsonValue({
            action: 'تحديث بيانات المتدرب',
            traineeName: after.nameAr,
            changedFields: changes
          })
        }
      });
    }

    await this.auditService.log({
      action: AuditAction.UPDATE,
      entity: 'Trainee',
      entityId: String(id),
      userId,
      details: toJsonValue({ before, after }),
    });

    return after;
  }

  /**
   * معاينة البيانات التي سيتم حذفها عند حذف متدرب
   */
  async getDeletionPreview(id: number) {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id },
      select: { id: true, nameAr: true, nameEn: true, nationalId: true },
    });

    if (!trainee) {
      throw new NotFoundException(`المتدرب غير موجود`);
    }

    const [
      attendanceCount,
      attendanceRecordCount,
      gradesCount,
      quizAttemptsCount,
      paymentsCount,
      paymentExceptionsCount,
      deferralRequestsCount,
      disciplinaryCount,
      traineeRequestsCount,
      documentsCount,
      notesCount,
      distributionCount,
      commissionsCount,
      paperAnswerSheetsCount,
      idCardPrintsCount,
      complaintsCount,
      gradeAppealsCount,
      surveyResponsesCount,
      traineeAuthCount,
      campaignRecipientsCount,
      studyMaterialDeliveriesCount,
      reminderDeliveriesCount,
      editHistoryCount,
      secondRoundFeeCount,
    ] = await Promise.all([
      this.prisma.attendance.count({ where: { traineeId: id } }),
      this.prisma.attendanceRecord.count({ where: { traineeId: id } }),
      this.prisma.traineeGrades.count({ where: { traineeId: id } }),
      this.prisma.quizAttempt.count({ where: { traineeId: id } }),
      this.prisma.traineePayment.count({ where: { traineeId: id } }),
      this.prisma.traineePaymentException.count({ where: { traineeId: id } }),
      this.prisma.paymentDeferralRequest.count({ where: { traineeId: id } }),
      this.prisma.disciplinaryAction.count({ where: { traineeId: id } }),
      this.prisma.traineeRequest.count({ where: { traineeId: id } }),
      this.prisma.traineeDocument.count({ where: { traineeId: id } }),
      this.prisma.traineeNote.count({ where: { traineeId: id } }),
      this.prisma.distributionAssignment.count({ where: { traineeId: id } }),
      this.prisma.commission.count({ where: { traineeId: id } }),
      this.prisma.paperAnswerSheet.count({ where: { traineeId: id } }),
      this.prisma.idCardPrint.count({ where: { traineeId: id } }),
      this.prisma.complaintSuggestion.count({ where: { traineeId: id } }),
      this.prisma.gradeAppeal.count({ where: { traineeId: id } }),
      this.prisma.surveyResponse.count({ where: { traineeId: id } }),
      this.prisma.traineeAuth.count({ where: { traineeId: id } }),
      this.prisma.campaignRecipient.count({ where: { traineeId: id } }),
      this.prisma.studyMaterialDelivery.count({ where: { traineeId: id } }),
      this.prisma.paymentReminderDelivery.count({ where: { traineeId: id } }),
      this.prisma.traineeEditHistory.count({ where: { traineeId: id } }),
      this.prisma.secondRoundFeeApplication.count({ where: { traineeId: id } }),
    ]);

    // تفاصيل المالية
    const payments = await this.prisma.traineePayment.findMany({
      where: { traineeId: id },
      include: { fee: true },
    });
    const totalFees = payments.reduce((sum, p) => sum + (p.fee?.amount || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    const items = [
      { label: 'سجلات الحضور والغياب', count: attendanceCount + attendanceRecordCount, icon: 'attendance' },
      { label: 'الدرجات', count: gradesCount, icon: 'grades' },
      { label: 'محاولات الاختبارات', count: quizAttemptsCount, icon: 'quizzes' },
      { label: 'المدفوعات والرسوم', count: paymentsCount, icon: 'payments', details: paymentsCount > 0 ? `إجمالي الرسوم: ${totalFees} | المدفوع: ${totalPaid} | المتبقي: ${totalFees - totalPaid}` : undefined },
      { label: 'طلبات استثناء السداد', count: paymentExceptionsCount, icon: 'exceptions' },
      { label: 'طلبات تأجيل السداد', count: deferralRequestsCount, icon: 'deferrals' },
      { label: 'الإجراءات التأديبية', count: disciplinaryCount, icon: 'disciplinary' },
      { label: 'طلبات المتدرب', count: traineeRequestsCount, icon: 'requests' },
      { label: 'الوثائق والمستندات', count: documentsCount, icon: 'documents' },
      { label: 'الملاحظات', count: notesCount, icon: 'notes' },
      { label: 'توزيع القاعات', count: distributionCount, icon: 'distribution' },
      { label: 'العمولات (سيتم فك الربط فقط)', count: commissionsCount, icon: 'commissions' },
      { label: 'أوراق إجابة ورقية', count: paperAnswerSheetsCount, icon: 'papers' },
      { label: 'طباعات بطاقة الهوية', count: idCardPrintsCount, icon: 'idcards' },
      { label: 'الشكاوى والمقترحات', count: complaintsCount, icon: 'complaints' },
      { label: 'التظلمات على الدرجات', count: gradeAppealsCount, icon: 'appeals' },
      { label: 'استجابات الاستبيانات', count: surveyResponsesCount, icon: 'surveys' },
      { label: 'حساب المنصة', count: traineeAuthCount, icon: 'auth' },
      { label: 'مستلمو الحملات', count: campaignRecipientsCount, icon: 'campaigns' },
      { label: 'تسليم مواد دراسية', count: studyMaterialDeliveriesCount, icon: 'materials' },
      { label: 'تذكيرات الدفع', count: reminderDeliveriesCount, icon: 'reminders' },
      { label: 'سجل تعديلات البيانات', count: editHistoryCount, icon: 'history' },
      { label: 'طلبات رسوم الدور الثاني', count: secondRoundFeeCount, icon: 'secondround' },
    ];

    const totalRecords = items.reduce((sum, item) => sum + item.count, 0);

    return {
      trainee,
      items: items.filter(item => item.count > 0),
      totalRecords,
      hasFinancialData: paymentsCount > 0,
    };
  }

  async remove(id: number, userId: string) {
    const trainee = await this.findOne(id);

    if (!trainee) {
      throw new NotFoundException(`Trainee with ID ${id} not found`);
    }

    // حذف جميع السجلات المرتبطة بالمتدرب أولاً
    await this.prisma.$transaction(async (prisma) => {
      // 1. حذف طلبات التأجيل
      await prisma.traineePaymentException.deleteMany({ where: { traineeId: id } });
      
      // 2. حذف الإجراءات التأديبية
      await prisma.disciplinaryAction.deleteMany({ where: { traineeId: id } });
      
      // 3. حذف طلبات المتدرب
      await prisma.traineeRequest.deleteMany({ where: { traineeId: id } });
      
      // 4. حذف طلبات تأجيل السداد
      await prisma.paymentDeferralRequest.deleteMany({ where: { traineeId: id } });
      
      // 5. حذف المدفوعات
      await prisma.traineePayment.deleteMany({ where: { traineeId: id } });
      
      // 6. حذف الحضور
      await prisma.attendanceRecord.deleteMany({ where: { traineeId: id } });
      
      // 7. حذف الدرجات
      await prisma.traineeGrades.deleteMany({ where: { traineeId: id } });
      
      // 8. حذف ورق الإجابة
      await prisma.paperAnswerSheet.deleteMany({ where: { traineeId: id } });
      
      // 9. حذف إجابات الاختبارات الإلكترونية
      await prisma.quizAttempt.deleteMany({ where: { traineeId: id } });
      
      // 10. فك ارتباط العمولات بالمتدرب المحذوف (الاحتفاظ بالعمولات)
      await prisma.commission.updateMany({ 
        where: { traineeId: id },
        data: { traineeId: null }
      });
      
      // 12. حذف المتدرب نفسه
      await prisma.trainee.delete({ where: { id } });
    });

    // تسجيل العملية في Audit Log
    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'Trainee',
      entityId: String(id),
      userId,
      details: toJsonValue({ 
        message: `Deleted trainee ${trainee.nameAr} and all related records. Commissions were preserved with traineeId set to null`, 
        deletedData: trainee 
      }),
    });

    return { message: 'تم حذف المتدرب وجميع السجلات المرتبطة به بنجاح' };
  }

  async getStats() {
    const totalTrainees = await this.prisma.trainee.count();
    
    const activeTrainees = await this.prisma.trainee.count({
      where: {
        traineeStatus: {
          in: [TraineeStatus.NEW, TraineeStatus.CURRENT],
        },
      },
    });

    const newTraineesThisMonth = await this.prisma.trainee.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        traineeStatus: TraineeStatus.NEW,
      },
    });

    const graduates = await this.prisma.trainee.count({
      where: {
        traineeStatus: TraineeStatus.GRADUATE,
      },
    });

    const graduationRate = totalTrainees > 0 ? Math.round((graduates / totalTrainees) * 100) : 0;

    return {
      totalTrainees,
      activeTrainees,
      newTrainees: newTraineesThisMonth,
      graduates,
      graduationRate,
    };
  }

  // ======== إدارة أرشيف وثائق المتدربين ========

  // الحصول على جميع وثائق المتدرب
  async getTraineeDocuments(traineeId: number) {
    // التحقق من وجود المتدرب وجلب الصورة الشخصية
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { 
        id: true, 
        nameAr: true, 
        photoUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    const documents = await this.prisma.traineeDocument.findMany({
      where: { traineeId },
      include: {
        uploadedBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    // إنشاء قائمة بجميع أنواع الوثائق المطلوبة
    const requiredDocuments = [
      { type: DocumentType.PERSONAL_PHOTO, nameAr: 'الصورة الشخصية', required: true },
      { type: DocumentType.ID_CARD_FRONT, nameAr: 'صورة البطاقة (وجه)', required: true },
      { type: DocumentType.ID_CARD_BACK, nameAr: 'صورة البطاقة (ظهر)', required: true },
      { type: DocumentType.QUALIFICATION_FRONT, nameAr: 'صورة المؤهل الدراسي (وجه)', required: true },
      { type: DocumentType.QUALIFICATION_BACK, nameAr: 'صورة المؤهل الدراسي (ظهر)', required: false },
      { type: DocumentType.EXPERIENCE_CERT, nameAr: 'صورة شهادة الخبرة', required: false },
      { type: DocumentType.MINISTRY_CERT, nameAr: 'صورة شهادة الوزارة', required: false },
      { type: DocumentType.PROFESSION_CARD, nameAr: 'صورة كارنيه مزاولة المهنة', required: false },
      { type: DocumentType.SKILL_CERT, nameAr: 'صورة شهادة قياس المهارة', required: false },
    ];

    // دمج الوثائق الموجودة مع القائمة المطلوبة
    const documentsWithStatus = requiredDocuments.map(reqDoc => {
      let existingDoc = documents.find(doc => doc.documentType === reqDoc.type);
      
      // إذا كان نوع الوثيقة هو الصورة الشخصية ولم توجد في الوثائق المرفوعة
      // ولكن يوجد photoUrl في بيانات المتدرب، إنشاء وثيقة وهمية
      if (reqDoc.type === DocumentType.PERSONAL_PHOTO && !existingDoc && trainee.photoUrl) {
        existingDoc = {
          id: `trainee-photo-${traineeId}`,
          traineeId: traineeId,
          documentType: DocumentType.PERSONAL_PHOTO,
          fileName: 'صورة شخصية',
          filePath: trainee.photoUrl,
          fileSize: 0, // غير معروف
          mimeType: 'image/jpeg', // افتراضي
          uploadedAt: trainee.createdAt,
          uploadedBy: {
            id: 'system',
            name: 'النظام'
          },
          notes: 'صورة شخصية مرفوعة من ملف المتدرب',
          isVerified: true, // افتراضياً محققة
          verifiedAt: trainee.createdAt,
          verifiedById: 'system',
          createdAt: trainee.createdAt,
          updatedAt: trainee.updatedAt
        } as any;
      }
      
      return {
        ...reqDoc,
        document: existingDoc || null,
        isUploaded: !!existingDoc,
        isVerified: existingDoc?.isVerified || false,
      };
    });

    // حساب إحصائيات الإكمال
    const totalRequired = requiredDocuments.filter(doc => doc.required).length;
    const totalOptional = requiredDocuments.filter(doc => !doc.required).length;
    const uploadedRequired = documentsWithStatus.filter(doc => doc.required && doc.isUploaded).length;
    const uploadedOptional = documentsWithStatus.filter(doc => !doc.required && doc.isUploaded).length;
    const verifiedCount = documentsWithStatus.filter(doc => doc.isVerified).length;

    const completionPercentage = totalRequired > 0 ? Math.round((uploadedRequired / totalRequired) * 100) : 100;

    return {
      trainee,
      documents: documentsWithStatus,
      stats: {
        totalRequired,
        totalOptional,
        uploadedRequired,
        uploadedOptional,
        verifiedCount,
        completionPercentage,
        isComplete: uploadedRequired === totalRequired,
      }
    };
  }

  // رفع وثيقة جديدة أو تحديث موجودة
  async uploadTraineeDocument(traineeId: number, createDocumentDto: CreateTraineeDocumentDto, userId: string) {
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { id: true, nameAr: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // التحقق من وجود وثيقة من نفس النوع
    const existingDocument = await this.prisma.traineeDocument.findUnique({
      where: {
        traineeId_documentType: {
          traineeId,
          documentType: createDocumentDto.documentType as any
        }
      }
    });

    let document;

    if (existingDocument) {
      // تحديث الوثيقة الموجودة
      document = await this.prisma.traineeDocument.update({
        where: { id: existingDocument.id },
        data: {
          fileName: createDocumentDto.fileName,
          filePath: createDocumentDto.filePath,
          fileSize: createDocumentDto.fileSize,
          mimeType: createDocumentDto.mimeType,
          notes: createDocumentDto.notes,
          uploadedAt: new Date(),
          uploadedById: userId,
          isVerified: false, // إعادة تعيين حالة التحقق عند التحديث
          verifiedAt: null,
          verifiedById: null,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true }
          }
        }
      });

      await this.auditService.log({
        action: AuditAction.UPDATE,
        entity: 'TraineeDocument',
        entityId: document.id,
        userId,
        details: {
          message: `Updated document ${createDocumentDto.documentType} for trainee ${trainee.nameAr}`,
          documentType: createDocumentDto.documentType,
          fileName: createDocumentDto.fileName,
        },
      });
    } else {
      // إنشاء وثيقة جديدة
      document = await this.prisma.traineeDocument.create({
        data: {
          ...createDocumentDto,
          traineeId,
          uploadedById: userId,
          documentType: createDocumentDto.documentType as any,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true }
          }
        }
      });

      await this.auditService.log({
        action: AuditAction.CREATE,
        entity: 'TraineeDocument',
        entityId: document.id,
        userId,
        details: {
          message: `Uploaded new document ${createDocumentDto.documentType} for trainee ${trainee.nameAr}`,
          documentType: createDocumentDto.documentType,
          fileName: createDocumentDto.fileName,
        },
      });
    }

    // إذا كانت الوثيقة المرفوعة هي صورة شخصية، تحديث photoUrl في بيانات المتدرب
    if (createDocumentDto.documentType === DocumentType.PERSONAL_PHOTO) {
      await this.prisma.trainee.update({
        where: { id: traineeId },
        data: { photoUrl: createDocumentDto.filePath }
      });
    }

    return document;
  }

  // تحديث حالة التحقق من الوثيقة
  async updateDocumentVerification(documentId: string, updateDto: UpdateTraineeDocumentDto, userId: string) {
    // التحقق من كون الوثيقة صورة شخصية وهمية
    if (documentId.startsWith('trainee-photo-')) {
      const traineeId = parseInt(documentId.replace('trainee-photo-', ''));
      
      // في هذه الحالة، لا يمكن تحديث حالة التحقق للصورة الوهمية
      // يمكن إنشاء وثيقة حقيقية بدلاً من ذلك إذا أراد المستخدم التحقق منها
      throw new BadRequestException('لا يمكن تحديث حالة التحقق للصورة الشخصية. يرجى رفع الصورة مرة أخرى من نظام الأرشيف للتحكم في حالة التحقق.');
    }

    const document = await this.prisma.traineeDocument.findUnique({
      where: { id: documentId },
      include: {
        trainee: { select: { id: true, nameAr: true } }
      }
    });

    if (!document) {
      throw new NotFoundException('الوثيقة غير موجودة');
    }

    const updatedDocument = await this.prisma.traineeDocument.update({
      where: { id: documentId },
      data: {
        notes: updateDto.notes !== undefined ? updateDto.notes : document.notes,
        isVerified: updateDto.isVerified !== undefined ? updateDto.isVerified : document.isVerified,
        verifiedAt: updateDto.isVerified ? new Date() : (updateDto.isVerified === false ? null : document.verifiedAt),
        verifiedById: updateDto.isVerified ? userId : (updateDto.isVerified === false ? null : document.verifiedById),
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        trainee: { select: { id: true, nameAr: true } }
      }
    });

    await this.auditService.log({
      action: AuditAction.UPDATE,
      entity: 'TraineeDocument',
      entityId: documentId,
      userId,
      details: {
        message: `Updated verification status for document ${document.documentType} of trainee ${document.trainee.nameAr}`,
        isVerified: updateDto.isVerified,
        notes: updateDto.notes,
      },
    });

    return updatedDocument;
  }

  // حذف وثيقة
  async deleteTraineeDocument(documentId: string, userId: string) {
    // التحقق من كون الوثيقة صورة شخصية وهمية
    if (documentId.startsWith('trainee-photo-')) {
      const traineeId = parseInt(documentId.replace('trainee-photo-', ''));
      
      // حذف الصورة الشخصية من بيانات المتدرب
      const trainee = await this.prisma.trainee.findUnique({
        where: { id: traineeId },
        select: { id: true, nameAr: true }
      });

      if (!trainee) {
        throw new NotFoundException('المتدرب غير موجود');
      }

      await this.prisma.trainee.update({
        where: { id: traineeId },
        data: { photoUrl: null }
      });

      await this.auditService.log({
        action: AuditAction.DELETE,
        entity: 'TraineePhoto',
        entityId: `trainee-${traineeId}`,
        userId,
        details: {
          message: `Deleted personal photo for trainee ${trainee.nameAr}`,
          fileName: 'صورة شخصية',
        },
      });

      return { message: 'تم حذف الصورة الشخصية بنجاح' };
    }

    const document = await this.prisma.traineeDocument.findUnique({
      where: { id: documentId },
      include: {
        trainee: { select: { id: true, nameAr: true } }
      }
    });

    if (!document) {
      throw new NotFoundException('الوثيقة غير موجودة');
    }

    await this.prisma.traineeDocument.delete({
      where: { id: documentId }
    });

    // إذا كانت الوثيقة المحذوفة هي صورة شخصية، تنظيف photoUrl في بيانات المتدرب
    if (document.documentType === DocumentType.PERSONAL_PHOTO) {
      await this.prisma.trainee.update({
        where: { id: document.traineeId },
        data: { photoUrl: null }
      });
    }

    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'TraineeDocument',
      entityId: documentId,
      userId,
      details: {
        message: `Deleted document ${document.documentType} for trainee ${document.trainee.nameAr}`,
        fileName: document.fileName,
      },
    });

    return { message: 'تم حذف الوثيقة بنجاح' };
  }

  // ======== إدارة الرسوم والتحقق من الحالة ========

  /**
   * التحقق من حالة الرسوم المطبقة على المتدرب وإعادة تطبيق الناقص منها
   */
  async checkAndFixTraineeFees(traineeId: number, userId: string) {
    console.log(`🔍 [CheckAndFixFees] بدء فحص الرسوم للمتدرب ${traineeId}`);
    
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: { program: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // الحصول على جميع الرسوم الدراسية للبرنامج
    const programFees = await this.prisma.traineeFee.findMany({
      where: {
        programId: trainee.programId,
        type: 'TUITION',
      },
      include: {
        safe: true,
      },
    });

    // الحصول على الرسوم المطبقة حالياً
    const appliedPayments = await this.prisma.traineePayment.findMany({
      where: {
        traineeId: traineeId,
        feeId: { in: programFees.map(fee => fee.id) },
      },
      include: {
        fee: true,
      },
    });

    const appliedFeeIds = new Set(appliedPayments.map(payment => payment.feeId));
    const missingFees = programFees.filter(fee => !appliedFeeIds.has(fee.id));

    const result = {
      traineeId,
      traineeName: trainee.nameAr,
      programName: trainee.program?.nameAr || 'غير محدد',
      totalProgramFees: programFees.length,
      appliedFees: appliedPayments.length,
      missingFees: missingFees.length,
      missingFeesList: missingFees.map(fee => ({
        id: fee.id,
        name: fee.name,
        amount: fee.amount,
        safeId: fee.safeId,
        safeName: fee.safe?.name,
      })),
      appliedFeesList: appliedPayments.map(payment => ({
        id: payment.fee.id,
        name: payment.fee.name,
        amount: payment.amount,
        paidAmount: payment.paidAmount,
        status: payment.status,
      })),
      isComplete: missingFees.length === 0,
    };

    console.log(`📊 [CheckAndFixFees] النتيجة: ${appliedPayments.length}/${programFees.length} رسوم مطبقة، ${missingFees.length} رسوم ناقصة`);

    // إذا كانت هناك رسوم ناقصة، محاولة تطبيقها
    if (missingFees.length > 0) {
      console.log(`🔧 [CheckAndFixFees] محاولة تطبيق ${missingFees.length} رسوم ناقصة`);
      
      try {
        const fixResult = await this.financesService.autoApplyFeesToNewTrainee(
          traineeId,
          trainee.programId,
          userId
        );

        // تسجيل نتيجة الإصلاح
        await this.auditService.log({
          action: AuditAction.UPDATE,
          entity: 'TraineePayment',
          entityId: String(traineeId),
          userId,
          details: {
            message: `Fixed missing fees for trainee ${trainee.nameAr}`,
            missingBefore: missingFees.length,
            appliedNow: fixResult.appliedFeesCount,
            totalAmount: fixResult.totalAppliedAmount,
            success: fixResult.success || false,
          },
        });

        return {
          ...result,
          fixAttempted: true,
          fixSuccessful: fixResult.success || false,
          fixResult,
        };
        
      } catch (error) {
        console.error(`❌ [CheckAndFixFees] فشل في إصلاح الرسوم:`, error);
        
        await this.auditService.log({
          action: AuditAction.UPDATE,
          entity: 'TraineePayment',
          entityId: String(traineeId),
          userId,
          details: {
            message: `Failed to fix missing fees for trainee ${trainee.nameAr}`,
            missingFees: missingFees.length,
            error: error.message,
          },
        });

        return {
          ...result,
          fixAttempted: true,
          fixSuccessful: false,
          fixError: error.message,
        };
      }
    }

    return result;
  }

  /**
   * التحقق من جميع المتدربين في برنامج معين والتأكد من تطبيق جميع الرسوم
   */
  async checkProgramFeesCompleteness(programId: number, userId: string) {
    console.log(`🔍 [CheckProgramFees] فحص اكتمال الرسوم للبرنامج ${programId}`);
    
    // الحصول على جميع متدربي البرنامج
    const trainees = await this.prisma.trainee.findMany({
      where: { programId },
      include: { program: true },
    });

    if (trainees.length === 0) {
      return {
        message: 'لا يوجد متدربين في هذا البرنامج',
        programId,
        traineesCount: 0,
        results: [],
      };
    }

    const results = [];
    let totalIssues = 0;

    // فحص كل متدرب
    for (const trainee of trainees) {
      try {
        const checkResult = await this.checkAndFixTraineeFees(trainee.id, userId);
        results.push(checkResult);
        
        if (!checkResult.isComplete) {
          totalIssues++;
        }
      } catch (error) {
        console.error(`❌ فشل فحص المتدرب ${trainee.id}:`, error);
        results.push({
          traineeId: trainee.id,
          traineeName: trainee.nameAr,
          error: error.message,
          isComplete: false,
        });
        totalIssues++;
      }
    }

    const summary = {
      programId,
      programName: trainees[0]?.program?.nameAr || 'غير محدد',
      totalTrainees: trainees.length,
      completeTrainees: results.filter(r => r.isComplete).length,
      incompleteTrainees: totalIssues,
      successfulFixes: results.filter(r => r.fixSuccessful).length,
      failedFixes: results.filter(r => r.fixAttempted && !r.fixSuccessful).length,
    };

    console.log(`📊 [CheckProgramFees] ملخص البرنامج: ${summary.completeTrainees}/${summary.totalTrainees} متدرب مكتمل الرسوم`);

    return {
      summary,
      results,
    };
  }

  /**
   * حذف مديونية المتدرب كاملاً من النظام
   * يشمل الحذف: TraineePayments, Transactions, وإرجاع أرصدة الخزائن
   */
  async deleteTraineeDebt(traineeId: number, userId: string) {
    console.log(`🗑️ [DeleteTraineeDebt] بدء حذف مديونية المتدرب ${traineeId}`);
    
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: { program: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // الحصول على جميع مدفوعات المتدرب مع التفاصيل
    const traineePayments = await this.prisma.traineePayment.findMany({
      where: { traineeId },
      include: {
        fee: {
          include: { safe: true }
        },
        transactions: true
      }
    });

    if (traineePayments.length === 0) {
      return {
        message: 'لا توجد مديونية للمتدرب',
        traineeId,
        traineeName: trainee.nameAr,
        deletedPayments: 0,
        deletedTransactions: 0,
        affectedSafes: 0
      };
    }

    let deletedPaymentsCount = 0;
    let deletedTransactionsCount = 0;
    const affectedSafes = new Map(); // safeId -> { name, balanceChange }
    const transactionsToDelete = [];

    // تجميع البيانات للحذف والتعديل
    for (const payment of traineePayments) {
      // حساب التأثير على الخزائن
      const feeAmount = payment.amount;
      const paidAmount = payment.paidAmount;
      
      // الخزينة الأصلية للرسوم (تم خصم منها عند تطبيق الرسوم)
      const originalSafeId = payment.fee.safeId;
      if (!affectedSafes.has(originalSafeId)) {
        affectedSafes.set(originalSafeId, {
          name: payment.fee.safe?.name || 'غير معروف',
          balanceChange: 0,
          feeReversals: 0, // إرجاع رسوم
          paymentReversals: 0 // إرجاع مدفوعات
        });
      }
      
      // إرجاع الرسوم المطبقة (كانت بالسالب، سنضيفها بالموجب)
      affectedSafes.get(originalSafeId).balanceChange += feeAmount;
      affectedSafes.get(originalSafeId).feeReversals += feeAmount;
      
      // إرجاع المدفوعات (كانت بالموجب، سنخصمها)
      affectedSafes.get(originalSafeId).balanceChange -= paidAmount;
      affectedSafes.get(originalSafeId).paymentReversals += paidAmount;

      // جمع معاملات الدفع المرتبطة
      for (const transaction of payment.transactions) {
        transactionsToDelete.push(transaction.id);
        
        // إذا كان هناك خزينة أخرى استقبلت المدفوعات
        if (transaction.targetId && transaction.targetId !== originalSafeId) {
          if (!affectedSafes.has(transaction.targetId)) {
            // نحتاج للحصول على بيانات هذه الخزينة
            const targetSafe = await this.prisma.safe.findUnique({
              where: { id: transaction.targetId },
              select: { name: true }
            });
            
            affectedSafes.set(transaction.targetId, {
              name: targetSafe?.name || 'غير معروف',
              balanceChange: 0,
              feeReversals: 0,
              paymentReversals: 0
            });
          }
          
          // خصم المدفوعات من الخزينة المستقبلة
          affectedSafes.get(transaction.targetId).balanceChange -= transaction.amount;
          affectedSafes.get(transaction.targetId).paymentReversals += transaction.amount;
        }
      }
    }

    // الحصول على معاملات الرسوم المرتبطة بالمتدرب
    const feeTransactions = await this.prisma.transaction.findMany({
      where: {
        type: 'FEE',
        traineeFeeId: { in: traineePayments.map(p => p.feeId) }
      }
    });

    // إضافة معاملات الرسوم للحذف
    for (const transaction of feeTransactions) {
      transactionsToDelete.push(transaction.id);
    }

    console.log(`📊 [DeleteTraineeDebt] سيتم حذف ${traineePayments.length} مدفوعات و ${transactionsToDelete.length} معاملة`);
    console.log(`🏦 [DeleteTraineeDebt] تأثير على ${affectedSafes.size} خزائن`);

    // تنفيذ الحذف في معاملة ذرية
    const result = await this.prisma.$transaction(async (prisma) => {
      // 1. حذف جميع المعاملات المرتبطة
      if (transactionsToDelete.length > 0) {
        await prisma.transaction.deleteMany({
          where: { id: { in: transactionsToDelete } }
        });
        deletedTransactionsCount = transactionsToDelete.length;
      }

      // 2. حذف جميع مدفوعات المتدرب
      await prisma.traineePayment.deleteMany({
        where: { traineeId }
      });
      deletedPaymentsCount = traineePayments.length;

      // 3. إرجاع أرصدة الخزائن
      for (const [safeId, safeData] of affectedSafes) {
        if (safeData.balanceChange !== 0) {
          await prisma.safe.update({
            where: { id: safeId },
            data: { 
              balance: { 
                increment: safeData.balanceChange 
              } 
            }
          });
          
          console.log(`💰 [DeleteTraineeDebt] تعديل خزينة "${safeData.name}": ${safeData.balanceChange > 0 ? '+' : ''}${safeData.balanceChange} جنيه`);
        }
      }

      // 4. تحديث حالة الرسوم إذا لزم الأمر
      // إذا لم يعد هناك متدربين آخرين لنفس الرسوم، يمكن إعادة تعيين isApplied
      const feeIds = [...new Set(traineePayments.map(p => p.feeId))];
      for (const feeId of feeIds) {
        const remainingPayments = await prisma.traineePayment.count({
          where: { feeId }
        });
        
        if (remainingPayments === 0) {
          await prisma.traineeFee.update({
            where: { id: feeId },
            data: {
              isApplied: false,
              appliedAt: null,
              appliedById: null
            }
          });
        }
      }

      return {
        deletedPayments: deletedPaymentsCount,
        deletedTransactions: deletedTransactionsCount,
        affectedSafes: Array.from(affectedSafes.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          balanceChange: data.balanceChange,
          feeReversals: data.feeReversals,
          paymentReversals: data.paymentReversals
        }))
      };
    });

    // تسجيل العملية في سجل التدقيق العام
    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'TraineeDebt',
      entityId: String(traineeId),
      userId,
      details: {
        message: `Completely deleted all debts for trainee ${trainee.nameAr}`,
        deletedPayments: result.deletedPayments,
        deletedTransactions: result.deletedTransactions,
        affectedSafes: result.affectedSafes,
        traineeId,
        traineeName: trainee.nameAr
      },
    });

    // تسجيل العملية في سجل التدقيق المالي
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, accountType: true }
      });
      
      const totalAmount = traineePayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      
      const auditContext: AuditContext = {
        userId,
        userName: user?.name || 'مستخدم غير معروف',
        userRole: user?.accountType,
      };

      await this.financialAuditService.logDebtDeletion(
        traineeId,
        trainee.nameAr,
        {
          deletedPayments: result.deletedPayments,
          deletedTransactions: result.deletedTransactions,
          affectedSafes: result.affectedSafes,
          totalAmount,
        },
        auditContext,
      );
    } catch (auditError) {
      console.error('❌ خطأ في تسجيل عملية حذف المديونية في سجل التدقيق المالي:', auditError);
    }

    console.log(`✅ [DeleteTraineeDebt] تم حذف مديونية المتدرب ${trainee.nameAr} بالكامل`);

    return {
      message: `تم حذف مديونية المتدرب ${trainee.nameAr} بالكامل من النظام`,
      traineeId,
      traineeName: trainee.nameAr,
      success: true,
      details: result
    };
  }

  /**
   * تحميل وتطبيق رسوم البرنامج على متدرب (الرسوم غير المطبقة فقط)
   */
  async loadAndApplyProgramFees(traineeId: number, userId: string, selectedFeeIds?: number[]) {
    console.log(`📥 [LoadProgramFees] تحميل رسوم البرنامج للمتدرب ${traineeId}`);
    
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: { program: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // الحصول على جميع رسوم البرنامج
    const programFees = await this.prisma.traineeFee.findMany({
      where: {
        programId: trainee.programId,
        type: 'TUITION', // رسوم دراسية فقط
        ...(selectedFeeIds && selectedFeeIds.length > 0 ? { id: { in: selectedFeeIds } } : {})
      },
      include: {
        safe: true,
      },
      orderBy: { id: 'asc' }
    });

    // الحصول على الرسوم المطبقة حالياً
    const appliedPayments = await this.prisma.traineePayment.findMany({
      where: {
        traineeId: traineeId,
        feeId: { in: programFees.map(fee => fee.id) },
      },
    });

    const appliedFeeIds = new Set(appliedPayments.map(payment => payment.feeId));
    const unappliedFees = programFees.filter(fee => !appliedFeeIds.has(fee.id));

    if (unappliedFees.length === 0) {
      return {
        message: selectedFeeIds && selectedFeeIds.length > 0 
          ? 'الرسوم المحددة مطبقة بالفعل على المتدرب'
          : 'جميع رسوم البرنامج مطبقة بالفعل على المتدرب',
        traineeId,
        traineeName: trainee.nameAr,
        programName: trainee.program?.nameAr,
        totalProgramFees: programFees.length,
        appliedBefore: appliedPayments.length,
        availableToApply: 0,
        appliedNow: 0,
        unappliedFees: []
      };
    }

    // إذا لم يتم تحديد رسوم معينة، إرجاع القائمة المتاحة للتطبيق
    if (!selectedFeeIds || selectedFeeIds.length === 0) {
      return {
        message: `يوجد ${unappliedFees.length} رسوم متاحة للتطبيق على المتدرب`,
        traineeId,
        traineeName: trainee.nameAr,
        programName: trainee.program?.nameAr,
        totalProgramFees: programFees.length,
        appliedBefore: appliedPayments.length,
        availableToApply: unappliedFees.length,
        appliedNow: 0,
        unappliedFees: unappliedFees.map(fee => ({
          id: fee.id,
          name: fee.name,
          amount: fee.amount,
          safeId: fee.safeId,
          safeName: fee.safe?.name,
          isApplied: fee.isApplied
        }))
      };
    }

    // تطبيق الرسوم المحددة
    console.log(`🔄 [LoadProgramFees] تطبيق ${unappliedFees.length} رسوم على المتدرب`);
    
    let totalAppliedAmount = 0;
    const appliedResults = [];

    try {
      const atomicResult = await this.prisma.$transaction(async (prisma) => {
        const transactionResults = [];
        const paymentResults = [];
        const feesToMarkApplied = [];

        for (const fee of unappliedFees) {
          console.log(`💰 [LoadProgramFees] تطبيق رسوم "${fee.name}" - مبلغ ${fee.amount} جنيه`);

          // إنشاء معاملة مالية للرسوم
          const transaction = await prisma.transaction.create({
            data: {
              amount: fee.amount,
              type: TransactionType.FEE,
              description: `تطبيق رسوم ${fee.name} للمتدرب ${trainee.nameAr} (تحميل من البرنامج)`,
              sourceId: fee.safeId,
              traineeFeeId: fee.id,
              createdById: userId,
            },
          });

          // خصم المبلغ من الخزينة
          await prisma.safe.update({
            where: { id: fee.safeId },
            data: { balance: { decrement: fee.amount } },
          });

          // إنشاء سجل مدفوعات للمتدرب
          const traineePayment = await prisma.traineePayment.create({
            data: {
              amount: fee.amount,
              feeId: fee.id,
              traineeId: traineeId,
              safeId: fee.safeId,
              status: 'PENDING',
            },
          });

          transactionResults.push(transaction);
          paymentResults.push(traineePayment);

          if (!fee.isApplied) {
            feesToMarkApplied.push(fee.id);
          }

          totalAppliedAmount += fee.amount;
          
          appliedResults.push({
            feeId: fee.id,
            feeName: fee.name,
            amount: fee.amount,
            status: 'applied',
            traineePayment,
            transaction
          });
        }

        // تحديث حالة الرسوم إلى مطبقة
        if (feesToMarkApplied.length > 0) {
          await prisma.traineeFee.updateMany({
            where: { id: { in: feesToMarkApplied } },
            data: {
              isApplied: true,
              appliedAt: new Date(),
              appliedById: userId,
            },
          });
        }

        return {
          transactions: transactionResults,
          payments: paymentResults,
          appliedFeesCount: paymentResults.length,
        };
      });

      // تسجيل العملية في سجل التدقيق العام
      await this.auditService.log({
        action: AuditAction.CREATE,
        entity: 'TraineePayment',
        entityId: String(traineeId),
        userId,
        details: {
          message: `Applied ${atomicResult.appliedFeesCount} program fees to trainee ${trainee.nameAr}`,
          totalAmount: totalAppliedAmount,
          appliedFees: appliedResults,
          loadFromProgram: true
        },
      });

      // تسجيل العملية في سجل التدقيق المالي
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, accountType: true }
        });
        const auditContext: AuditContext = {
          userId,
          userName: user?.name || 'مستخدم غير معروف',
          userRole: user?.accountType,
        };
        await this.financialAuditService.logFeeLoadingOnTrainee(
          traineeId,
          trainee.nameAr,
          trainee.program?.nameAr || '',
          appliedResults.map(r => ({ feeName: r.feeName, amount: r.amount, type: 'TUITION' })),
          totalAppliedAmount,
          false, // رسوم أساسية
          auditContext,
        );
      } catch (auditError) {
        console.error('❌ خطأ في تسجيل التدقيق المالي:', auditError);
      }

      console.log(`✅ [LoadProgramFees] تم تطبيق ${atomicResult.appliedFeesCount} رسوم بنجاح`);

      return {
        message: `تم تطبيق ${atomicResult.appliedFeesCount} رسوم من البرنامج على المتدرب ${trainee.nameAr}`,
        traineeId,
        traineeName: trainee.nameAr,
        programName: trainee.program?.nameAr,
        totalProgramFees: programFees.length,
        appliedBefore: appliedPayments.length,
        availableToApply: unappliedFees.length,
        appliedNow: atomicResult.appliedFeesCount,
        totalAppliedAmount,
        appliedFees: appliedResults,
        success: true
      };

    } catch (error) {
      console.error(`❌ [LoadProgramFees] فشل في تطبيق الرسوم:`, error);
      
      throw new BadRequestException({
        message: 'فشل في تطبيق رسوم البرنامج على المتدرب',
        error: error.message,
        traineeId,
        availableFeesCount: unappliedFees.length
      });
    }
  }

  // دالة لتحميل وتطبيق الرسوم الإضافية (غير الدراسية)
  async loadAndApplyAdditionalFees(
    traineeId: number,
    userId: string,
    selectedFeeIds?: number[]
  ) {
    console.log(`🔄 [LoadAdditionalFees] بدء تحميل الرسوم الإضافية للمتدرب ${traineeId}`);

    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: { program: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // الحصول على جميع الرسوم الإضافية (غير الدراسية) للبرنامج
    const programFees = await this.prisma.traineeFee.findMany({
      where: {
        programId: trainee.programId,
        type: { not: 'TUITION' }, // جميع الأنواع عدا الدراسية
        ...(selectedFeeIds && selectedFeeIds.length > 0 ? { id: { in: selectedFeeIds } } : {})
      },
      include: {
        safe: true,
      },
      orderBy: { id: 'asc' }
    });

    // الحصول على الرسوم المطبقة حالياً
    const appliedPayments = await this.prisma.traineePayment.findMany({
      where: {
        traineeId: traineeId,
        feeId: { in: programFees.map(fee => fee.id) },
      },
      include: {
        fee: true,
      },
    });

    // تحديد الرسوم غير المطبقة
    const appliedFeeIds = new Set(appliedPayments.map(payment => payment.feeId));
    const unappliedFees = programFees.filter(fee => !appliedFeeIds.has(fee.id));

    console.log(`📊 [LoadAdditionalFees] إجمالي الرسوم الإضافية: ${programFees.length}, المطبقة: ${appliedPayments.length}, المتاحة: ${unappliedFees.length}`);

    // إذا لم توجد رسوم متاحة للتطبيق
    if (unappliedFees.length === 0) {
      return {
        message: 'جميع الرسوم الإضافية مطبقة بالفعل على هذا المتدرب',
        traineeId,
        traineeName: trainee.nameAr,
        programName: trainee.program?.nameAr,
        totalProgramFees: programFees.length,
        appliedBefore: appliedPayments.length,
        availableToApply: 0,
        appliedNow: 0,
        unappliedFees: []
      };
    }

    // إذا لم يتم تحديد رسوم معينة، إرجاع القائمة المتاحة للتطبيق
    if (!selectedFeeIds || selectedFeeIds.length === 0) {
      return {
        message: `يوجد ${unappliedFees.length} رسوم إضافية متاحة للتطبيق على المتدرب`,
        traineeId,
        traineeName: trainee.nameAr,
        programName: trainee.program?.nameAr,
        totalProgramFees: programFees.length,
        appliedBefore: appliedPayments.length,
        availableToApply: unappliedFees.length,
        appliedNow: 0,
        unappliedFees: unappliedFees.map(fee => ({
          id: fee.id,
          name: fee.name,
          amount: fee.amount,
          type: fee.type,
          safeId: fee.safeId,
          safeName: fee.safe?.name,
          isApplied: false
        })),
        appliedFees: appliedPayments.map(payment => ({
          id: payment.fee.id,
          name: payment.fee.name,
          amount: payment.amount,
          type: payment.fee.type,
          paidAmount: payment.paidAmount,
          status: payment.status,
          isApplied: true
        }))
      };
    }

    // تطبيق الرسوم المحددة (نفس logic الرسوم العادية)
    console.log(`🔄 [LoadAdditionalFees] تطبيق ${unappliedFees.length} رسوم إضافية على المتدرب`);
    
    let totalAppliedAmount = 0;

    try {
      const atomicResult = await this.prisma.$transaction(async (prisma) => {
        const transactionResults = [];
        const paymentResults = [];

        for (const fee of unappliedFees) {
          console.log(`💰 [LoadAdditionalFees] تطبيق رسوم "${fee.name}" - نوع ${fee.type} - مبلغ ${fee.amount} جنيه`);

          // إنشاء معاملة مالية للرسوم (مطابقة لبنية loadAndApplyProgramFees)
          const transaction = await prisma.transaction.create({
            data: {
              amount: fee.amount,
              type: TransactionType.FEE,
              description: `تطبيق رسوم ${fee.name} للمتدرب ${trainee.nameAr} (رسوم إضافية)`,
              sourceId: fee.safeId,
              traineeFeeId: fee.id,
              createdById: userId,
            },
          });

          // إنشاء سجل مدفوعات المتدرب (مطابقة لبنية loadAndApplyProgramFees)
          const payment = await prisma.traineePayment.create({
            data: {
              amount: fee.amount,
              feeId: fee.id,
              traineeId: traineeId,
              safeId: fee.safeId,
              status: 'PENDING',
            },
          });

          // تحديث رصيد الخزينة بالسالب (دين)
          await prisma.safe.update({
            where: { id: fee.safeId },
            data: {
              balance: {
                decrement: fee.amount,
              },
            },
          });

          transactionResults.push(transaction);
          paymentResults.push(payment);
          totalAppliedAmount += fee.amount;
        }

        return { transactionResults, paymentResults };
      });

      console.log(`✅ [LoadAdditionalFees] تم تطبيق ${unappliedFees.length} رسوم إضافية بنجاح، إجمالي المبلغ: ${totalAppliedAmount} جنيه`);

      // تسجيل العملية في سجل التدقيق العام
      await this.auditService.log({
        action: AuditAction.CREATE,
        entity: 'TraineePayment',
        entityId: String(traineeId),
        userId,
        details: {
          message: `Applied ${unappliedFees.length} additional fees to trainee ${trainee.nameAr}`,
          totalAmount: totalAppliedAmount,
          appliedFees: unappliedFees.map(f => ({ name: f.name, amount: f.amount, type: f.type })),
          isAdditional: true
        },
      });

      // تسجيل العملية في سجل التدقيق المالي
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, accountType: true }
        });
        const auditContext: AuditContext = {
          userId,
          userName: user?.name || 'مستخدم غير معروف',
          userRole: user?.accountType,
        };
        await this.financialAuditService.logFeeLoadingOnTrainee(
          traineeId,
          trainee.nameAr,
          trainee.program?.nameAr || '',
          unappliedFees.map(f => ({ feeName: f.name, amount: f.amount, type: f.type })),
          totalAppliedAmount,
          true, // رسوم إضافية
          auditContext,
        );
      } catch (auditError) {
        console.error('❌ خطأ في تسجيل التدقيق المالي:', auditError);
      }

      return {
        success: true,
        message: `تم تطبيق ${unappliedFees.length} رسوم إضافية بنجاح على المتدرب ${trainee.nameAr}`,
        traineeId,
        traineeName: trainee.nameAr,
        programName: trainee.program?.nameAr,
        totalProgramFees: programFees.length,
        appliedBefore: appliedPayments.length,
        availableToApply: 0,
        appliedNow: unappliedFees.length,
        totalAppliedAmount,
        appliedFees: unappliedFees.map(fee => ({
          id: fee.id,
          name: fee.name,
          type: fee.type,
          amount: fee.amount,
        })),
      };

    } catch (error) {
      console.error(`❌ [LoadAdditionalFees] فشل في تطبيق الرسوم الإضافية:`, error);
      throw new BadRequestException(`فشل في تطبيق الرسوم الإضافية: ${error.message}`);
    }
  }

  // الحصول على إحصائيات إكمال الوثائق لجميع المتدربين
  async getDocumentsCompletionStats(filters?: {
    programId?: number;
    completionStatus?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    
    // بناء شروط التصفية
    const whereConditions: any = {};
    
    if (filters?.programId) {
      whereConditions.programId = filters.programId;
    }
    
    if (filters?.dateFrom || filters?.dateTo) {
      whereConditions.createdAt = {};
      if (filters.dateFrom) {
        whereConditions.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        whereConditions.createdAt.lte = filters.dateTo;
      }
    }

    // إضافة شرط البحث
    if (filters?.search) {
      whereConditions.OR = [
        { nameAr: { contains: filters.search } },
        { nameEn: { contains: filters.search } },
      ];
    }

    // جلب جميع المتدربين لحساب الإحصائيات الإجمالية
    const allTrainees = await this.prisma.trainee.findMany({
      where: whereConditions,
      include: {
        documents: true,
        program: { select: { nameAr: true } }
      }
    });

    const requiredDocumentTypes = [
      DocumentType.PERSONAL_PHOTO,
      DocumentType.ID_CARD_FRONT,
      DocumentType.ID_CARD_BACK,
      DocumentType.QUALIFICATION_FRONT,
    ];

    const stats = allTrainees.map(trainee => {
      let uploadedRequired = trainee.documents.filter(doc => 
        requiredDocumentTypes.includes(doc.documentType as DocumentType)
      ).length;
      
      // حساب إجمالي الوثائق بما في ذلك الصورة الشخصية إذا كانت موجودة
      let totalDocuments = trainee.documents.length;
      let verifiedDocuments = trainee.documents.filter(doc => doc.isVerified).length;
      
      // إضافة الصورة الشخصية إذا كانت موجودة في photoUrl ولكن ليست في الوثائق
      const hasPersonalPhotoDoc = trainee.documents.some(doc => doc.documentType === DocumentType.PERSONAL_PHOTO);
      if (trainee.photoUrl && !hasPersonalPhotoDoc) {
        totalDocuments += 1;
        verifiedDocuments += 1; // افتراضياً محققة
        uploadedRequired += 1; // إضافة للوثائق المطلوبة المرفوعة
      }
      
      const completionPercentage = Math.round((uploadedRequired / requiredDocumentTypes.length) * 100);
      
      return {
        traineeId: trainee.id,
        traineeName: trainee.nameAr,
        photoUrl: trainee.photoUrl || null,
        programName: trainee.program?.nameAr || 'غير محدد',
        totalDocuments,
        requiredDocuments: uploadedRequired,
        completionPercentage,
        isComplete: uploadedRequired === requiredDocumentTypes.length,
        verifiedDocuments,
      };
    });

    // تصفية حسب حالة الإكمال
    let filteredStats = stats;
    if (filters?.completionStatus) {
      switch (filters.completionStatus) {
        case 'complete':
          filteredStats = stats.filter(s => s.isComplete);
          break;
        case 'incomplete':
          filteredStats = stats.filter(s => !s.isComplete);
          break;
        case 'high': // 80% أو أكثر
          filteredStats = stats.filter(s => s.completionPercentage >= 80);
          break;
        case 'medium': // 50% - 79%
          filteredStats = stats.filter(s => s.completionPercentage >= 50 && s.completionPercentage < 80);
          break;
        case 'low': // أقل من 50%
          filteredStats = stats.filter(s => s.completionPercentage < 50);
          break;
      }
    }

    const overallStats = {
      totalTrainees: filteredStats.length,
      completeTrainees: filteredStats.filter(s => s.isComplete).length,
      incompleteTrainees: filteredStats.filter(s => !s.isComplete).length,
      averageCompletion: Math.round(filteredStats.reduce((sum, s) => sum + s.completionPercentage, 0) / filteredStats.length) || 0,
    };

    // ترتيب البيانات
    const sortedStats = filteredStats.sort((a, b) => b.completionPercentage - a.completionPercentage);

    // تطبيق pagination
    const skip = (page - 1) * limit;
    const paginatedStats = sortedStats.slice(skip, skip + limit);
    
    // حساب معلومات pagination
    const total = sortedStats.length;
    const totalPages = Math.ceil(total / limit);

    return {
      overallStats,
      traineeStats: paginatedStats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // الحصول على تقرير مفصل عن وثائق المتدربين مع حالة كل وثيقة
  async getDetailedDocumentsReport(filters?: {
    programId?: number;
    completionStatus?: string;
    search?: string;
    limit?: number;
  }) {
    // بناء شروط التصفية
    const whereConditions: any = {};
    
    if (filters?.programId) {
      whereConditions.programId = filters.programId;
    }

    if (filters?.search) {
      whereConditions.OR = [
        { nameAr: { contains: filters.search } },
        { nameEn: { contains: filters.search } },
      ];
    }

    // جلب المتدربين مع وثائقهم
    const trainees = await this.prisma.trainee.findMany({
      where: whereConditions,
      include: {
        documents: true,
        program: { select: { nameAr: true } }
      },
      orderBy: { nameAr: 'asc' },
      take: filters?.limit || 10000
    });

    const requiredDocumentTypes = [
      { type: DocumentType.PERSONAL_PHOTO, nameAr: 'الصورة الشخصية' },
      { type: DocumentType.ID_CARD_FRONT, nameAr: 'صورة البطاقة (وجه)' },
      { type: DocumentType.ID_CARD_BACK, nameAr: 'صورة البطاقة (ظهر)' },
      { type: DocumentType.QUALIFICATION_FRONT, nameAr: 'صورة المؤهل الدراسي (وجه)' },
    ];

    // معالجة بيانات كل متدرب
    const detailedStats = trainees.map(trainee => {
      // إنشاء كائن لحالة كل وثيقة
      const documentStatuses = {};
      
      requiredDocumentTypes.forEach(docType => {
        let doc = trainee.documents.find(d => d.documentType === docType.type);
        
        // التحقق من الصورة الشخصية في photoUrl إذا لم تكن في الوثائق
        if (docType.type === DocumentType.PERSONAL_PHOTO && !doc && trainee.photoUrl) {
          documentStatuses[docType.type] = {
            nameAr: docType.nameAr,
            isUploaded: true,
            isVerified: true,
            uploadedAt: trainee.createdAt
          };
        } else if (doc) {
          documentStatuses[docType.type] = {
            nameAr: docType.nameAr,
            isUploaded: true,
            isVerified: doc.isVerified,
            uploadedAt: doc.uploadedAt,
            verifiedAt: doc.verifiedAt
          };
        } else {
          documentStatuses[docType.type] = {
            nameAr: docType.nameAr,
            isUploaded: false,
            isVerified: false,
            uploadedAt: null
          };
        }
      });

      // حساب عدد الوثائق المرفوعة والمحققة
      let uploadedRequired = 0;
      let verifiedRequired = 0;
      
      Object.values(documentStatuses).forEach((status: any) => {
        if (status.isUploaded) uploadedRequired++;
        if (status.isVerified) verifiedRequired++;
      });
      
      const completionPercentage = Math.round((uploadedRequired / requiredDocumentTypes.length) * 100);
      const isComplete = uploadedRequired === requiredDocumentTypes.length;
      
      return {
        traineeId: trainee.id,
        traineeName: trainee.nameAr,
        programName: trainee.program?.nameAr || 'غير محدد',
        documentStatuses,
        totalDocuments: trainee.documents.length,
        requiredDocuments: uploadedRequired,
        verifiedDocuments: verifiedRequired,
        completionPercentage,
        isComplete
      };
    });

    // تصفية حسب حالة الإكمال
    let filteredStats = detailedStats;
    if (filters?.completionStatus) {
      switch (filters.completionStatus) {
        case 'complete':
          filteredStats = detailedStats.filter(s => s.isComplete);
          break;
        case 'incomplete':
          filteredStats = detailedStats.filter(s => !s.isComplete);
          break;
        case 'high':
          filteredStats = detailedStats.filter(s => s.completionPercentage >= 80);
          break;
        case 'medium':
          filteredStats = detailedStats.filter(s => s.completionPercentage >= 50 && s.completionPercentage < 80);
          break;
        case 'low':
          filteredStats = detailedStats.filter(s => s.completionPercentage < 50);
          break;
      }
    }

    // حساب الإحصائيات الإجمالية
    const overallStats = {
      totalTrainees: filteredStats.length,
      completeTrainees: filteredStats.filter(s => s.isComplete).length,
      incompleteTrainees: filteredStats.filter(s => !s.isComplete).length,
      averageCompletion: Math.round(filteredStats.reduce((sum, s) => sum + s.completionPercentage, 0) / filteredStats.length) || 0,
    };

    return {
      overallStats,
      traineeStats: filteredStats,
      requiredDocumentTypes: requiredDocumentTypes.map(d => d.nameAr)
    };
  }

  // ======== إدارة ملاحظات المتدربين ========

  /**
   * الحصول على جميع ملاحظات المتدرب
   */
  async getTraineeNotes(traineeId: number) {
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { id: true, nameAr: true }
    });

    if (!trainee) {
      throw new NotFoundException(`المتدرب غير موجود`);
    }

    const notes = await this.prisma.traineeNote.findMany({
      where: { traineeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      trainee: {
        id: trainee.id,
        name: trainee.nameAr
      },
      notes,
      count: notes.length
    };
  }

  /**
   * إضافة ملاحظة جديدة للمتدرب
   */
  async createTraineeNote(traineeId: number, data: { content: string }, userId: string) {
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { id: true, nameAr: true }
    });

    if (!trainee) {
      throw new NotFoundException(`المتدرب غير موجود`);
    }

    const note = await this.prisma.traineeNote.create({
      data: {
        content: data.content,
        traineeId,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // تسجيل في audit log
    await this.auditService.log({
      entity: 'Trainee',
      entityId: traineeId.toString(),
      action: AuditAction.UPDATE,
      userId: userId,
      details: toJsonValue({
        message: 'تم إضافة ملاحظة جديدة للمتدرب',
        traineeName: trainee.nameAr,
        notePreview: data.content.substring(0, 100)
      })
    });

    return {
      message: 'تم إضافة الملاحظة بنجاح',
      note
    };
  }

  /**
   * تحديث ملاحظة موجودة
   */
  async updateTraineeNote(noteId: string, data: { content: string }, userId: string) {
    // التحقق من وجود الملاحظة
    const existingNote = await this.prisma.traineeNote.findUnique({
      where: { id: noteId },
      include: {
        trainee: {
          select: { id: true, nameAr: true }
        }
      }
    });

    if (!existingNote) {
      throw new NotFoundException(`الملاحظة غير موجودة`);
    }

    // التحقق من أن المستخدم هو من قام بإنشاء الملاحظة
    if (existingNote.userId !== userId) {
      throw new BadRequestException('لا يمكنك تعديل ملاحظة قام بإنشائها مستخدم آخر');
    }

    const updatedNote = await this.prisma.traineeNote.update({
      where: { id: noteId },
      data: {
        content: data.content
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // تسجيل في audit log
    await this.auditService.log({
      entity: 'Trainee',
      entityId: existingNote.traineeId.toString(),
      action: AuditAction.UPDATE,
      userId: userId,
      details: toJsonValue({
        message: 'تم تحديث ملاحظة المتدرب',
        traineeName: existingNote.trainee.nameAr,
        notePreview: data.content.substring(0, 100)
      })
    });

    return {
      message: 'تم تحديث الملاحظة بنجاح',
      note: updatedNote
    };
  }

  // ======== سجل تعديلات المتدربين ========

  /**
   * الحصول على سجل تعديلات المتدرب
   */
  async getTraineeEditHistory(traineeId: number) {
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: {
        id: true,
        nameAr: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    if (!trainee) {
      throw new NotFoundException(`المتدرب غير موجود`);
    }

    const history = await this.prisma.traineeEditHistory.findMany({
      where: { traineeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      trainee: {
        id: trainee.id,
        name: trainee.nameAr,
        createdBy: trainee.createdBy,
        updatedBy: trainee.updatedBy,
        createdAt: trainee.createdAt,
        updatedAt: trainee.updatedAt
      },
      history,
      count: history.length
    };
  }

  /**
   * حذف ملاحظة
   */
  async deleteTraineeNote(noteId: string, userId: string) {
    // التحقق من وجود الملاحظة
    const existingNote = await this.prisma.traineeNote.findUnique({
      where: { id: noteId },
      include: {
        trainee: {
          select: { id: true, nameAr: true }
        }
      }
    });

    if (!existingNote) {
      throw new NotFoundException(`الملاحظة غير موجودة`);
    }

    // التحقق من أن المستخدم هو من قام بإنشاء الملاحظة
    if (existingNote.userId !== userId) {
      throw new BadRequestException('لا يمكنك حذف ملاحظة قام بإنشائها مستخدم آخر');
    }

    await this.prisma.traineeNote.delete({
      where: { id: noteId }
    });

    // تسجيل في audit log
    await this.auditService.log({
      entity: 'Trainee',
      entityId: existingNote.traineeId.toString(),
      action: AuditAction.UPDATE,
      userId: userId,
      details: toJsonValue({
        message: 'تم حذف ملاحظة المتدرب',
        traineeName: existingNote.trainee.nameAr,
        notePreview: existingNote.content.substring(0, 100)
      })
    });

    return {
      message: 'تم حذف الملاحظة بنجاح'
    };
  }

  /**
   * استخراج بيانات المتدربين في ملف Excel
   */
  async exportTrainees(exportOptions: any, userId: string) {
    try {
      // بناء استعلام البيانات
      const whereClause: any = {};
      
      if (exportOptions.programId) {
        whereClause.programId = exportOptions.programId;
      }

      // جلب المتدربين مع البيانات المطلوبة
      const trainees = await this.prisma.trainee.findMany({
        where: whereClause,
        include: {
          program: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
            }
          },
          grades: exportOptions.includeGradesData ? {
            select: {
              id: true,
              totalMarks: true,
            }
          } : false,
        },
        orderBy: {
          nameAr: 'asc'
        }
      });

      // جلب بيانات المواقع الجغرافية للترجمة
      const [countries, governorates, cities] = await Promise.all([
        this.prisma.country.findMany({ select: { code: true, nameAr: true } }),
        this.prisma.governorate.findMany({ select: { code: true, nameAr: true } }),
        this.prisma.city.findMany({ select: { code: true, nameAr: true } })
      ]);

      // إنشاء Maps للبحث السريع
      const countryMap = new Map(countries.map(c => [c.code, c.nameAr]));
      const governorateMap = new Map(governorates.map(g => [g.code, g.nameAr]));
      const cityMap = new Map(cities.map(c => [c.code, c.nameAr]));

      // جلب المتدربين حسب البرنامج المحدد فقط
      let filteredTrainees = trainees;
      
      console.log(`📊 Exporting trainees for program: ${exportOptions.programId || 'All programs'}`);
      console.log(`📈 Total trainees found: ${trainees.length}`);

      // تحويل البيانات إلى تنسيق Excel
      const excelData = this.formatTraineesForExcel(filteredTrainees, exportOptions, {
        countryMap,
        governorateMap,
        cityMap
      });

      // إنشاء ملف Excel
      const workbook = this.createExcelWorkbook(excelData);

      // تحويل إلى buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // تسجيل العملية في audit log
      await this.auditService.log({
        entity: 'Trainee',
        entityId: 'export',
        action: AuditAction.CREATE,
        userId: userId,
        details: toJsonValue({
          message: 'تم استخراج بيانات المتدربين',
          traineeCount: filteredTrainees.length,
          exportOptions: exportOptions
        })
      });

      return buffer;

    } catch (error) {
      console.error('Error exporting trainees:', error);
      throw new BadRequestException('حدث خطأ أثناء استخراج البيانات');
    }
  }

  /**
   * تحويل متدرب من برنامج إلى برنامج آخر
   */
  async transferTrainee(traineeId: number, newProgramId: number, userId: string, deleteOldDebt: boolean = false) {
    try {
      // التحقق من وجود المتدرب
      const trainee = await this.prisma.trainee.findUnique({
        where: { id: traineeId },
        include: {
          program: true
        }
      });

      if (!trainee) {
        throw new BadRequestException('المتدرب غير موجود');
      }

      // التحقق من وجود البرنامج الجديد
      const newProgram = await this.prisma.trainingProgram.findUnique({
        where: { id: newProgramId }
      });

      if (!newProgram) {
        throw new BadRequestException('البرنامج الجديد غير موجود');
      }

      // التحقق من أن المتدرب ليس في نفس البرنامج
      if (trainee.programId === newProgramId) {
        throw new BadRequestException('المتدرب موجود بالفعل في هذا البرنامج');
      }

      // حذف المديونية القديمة إذا طلب المستخدم ذلك
      let debtDeletionResult = null;
      if (deleteOldDebt) {
        try {
          console.log(`🗑️ [Transfer] حذف مديونية المتدرب ${trainee.nameAr} قبل التحويل...`);
          debtDeletionResult = await this.deleteTraineeDebt(traineeId, userId);
          console.log(`✅ [Transfer] تم حذف المديونية بنجاح`);
        } catch (debtError) {
          console.error('❌ [Transfer] خطأ في حذف المديونية:', debtError);
          throw new BadRequestException('فشل حذف المديونية القديمة. يرجى المحاولة مرة أخرى.');
        }
      }

      // بدء المعاملة
      const result = await this.prisma.$transaction(async (prisma) => {
        const oldProgramId = trainee.programId;

        // === حذف جميع البيانات التدريبية للبرنامج القديم ===

        // 1. جلب فصول البرنامج القديم
        const oldClassrooms = await prisma.classroom.findMany({
          where: { programId: oldProgramId },
          select: { id: true },
        });
        const oldClassroomIds = oldClassrooms.map(c => c.id);

        if (oldClassroomIds.length > 0) {
          // 2. جلب المحتويات التدريبية للبرنامج القديم
          const oldContents = await prisma.trainingContent.findMany({
            where: { classroomId: { in: oldClassroomIds } },
            select: { id: true },
          });
          const oldContentIds = oldContents.map(c => c.id);

          // 3. حذف الدرجات
          await prisma.traineeGrades.deleteMany({
            where: { traineeId, classroomId: { in: oldClassroomIds } },
          });

          // 4. حذف سجلات الحضور (جدول Attendance - النظام الجديد)
          if (oldContentIds.length > 0) {
            const oldScheduledSessions = await prisma.scheduledSession.findMany({
              where: { scheduleSlot: { classroomId: { in: oldClassroomIds } } },
              select: { id: true },
            });
            const oldScheduledSessionIds = oldScheduledSessions.map(s => s.id);

            if (oldScheduledSessionIds.length > 0) {
              await prisma.attendance.deleteMany({
                where: { traineeId, sessionId: { in: oldScheduledSessionIds } },
              });
            }

            // 5. حذف سجلات الحضور (جدول AttendanceRecord - النظام القديم)
            const oldSessions = await prisma.session.findMany({
              where: { contentId: { in: oldContentIds } },
              select: { id: true },
            });
            const oldSessionIds = oldSessions.map(s => s.id);

            if (oldSessionIds.length > 0) {
              await prisma.attendanceRecord.deleteMany({
                where: { traineeId, sessionId: { in: oldSessionIds } },
              });
            }

            // 6. حذف محاولات الاختبارات الإلكترونية
            const oldQuizzes = await prisma.quiz.findMany({
              where: { trainingContentId: { in: oldContentIds } },
              select: { id: true },
            });
            const oldQuizIds = oldQuizzes.map(q => q.id);

            if (oldQuizIds.length > 0) {
              await prisma.quizAttempt.deleteMany({
                where: { traineeId, quizId: { in: oldQuizIds } },
              });
            }

            // 7. حذف أوراق الإجابة الورقية
            const oldPaperExams = await prisma.paperExam.findMany({
              where: { trainingContentId: { in: oldContentIds } },
              select: { id: true },
            });
            const oldPaperExamIds = oldPaperExams.map(e => e.id);

            if (oldPaperExamIds.length > 0) {
              await prisma.paperAnswerSheet.deleteMany({
                where: { traineeId, paperExamId: { in: oldPaperExamIds } },
              });
            }
          }
        }

        // 8. حذف التوزيعات السابقة للمتدرب
        await prisma.distributionAssignment.deleteMany({
          where: { traineeId },
        });

        // 9. تحديث البرنامج للمتدرب
        const updatedTrainee = await prisma.trainee.update({
          where: { id: traineeId },
          data: {
            programId: newProgramId,
            updatedById: userId,
            updatedAt: new Date()
          },
          include: {
            program: true
          }
        });

        // تسجيل العملية في audit log
        await this.auditService.log({
          entity: 'Trainee',
          entityId: traineeId.toString(),
          action: AuditAction.UPDATE,
          userId: userId,
          details: toJsonValue({
            message: 'تم تحويل المتدرب بين البرامج مع حذف جميع البيانات التدريبية القديمة',
            oldProgram: trainee.program.nameAr,
            newProgram: newProgram.nameAr,
            traineeName: trainee.nameAr,
            cleanedData: {
              classrooms: oldClassroomIds.length,
            }
          })
        });

        return updatedTrainee;
      });

      // تطبيق الرسوم الدراسية للبرنامج الجديد تلقائياً
      try {
        console.log(`🔄 تطبيق الرسوم الدراسية للبرنامج الجديد على المتدرب ${result.nameAr}`);
        
        const feesResult = await this.financesService.autoApplyFeesToNewTrainee(
          result.id,
          newProgramId,
          userId
        );

        // تسجيل تطبيق الرسوم في audit log
        if (feesResult.appliedFeesCount > 0) {
          await this.auditService.log({
            action: AuditAction.CREATE,
            entity: 'TraineePayment',
            entityId: String(result.id),
            userId,
            details: { 
              message: `Auto-applied ${feesResult.appliedFeesCount} tuition fees to transferred trainee ${result.nameAr}`,
              totalAmount: feesResult.totalAppliedAmount,
              appliedFees: feesResult.results.filter(r => r.status === 'applied'),
              transferOperation: true,
              newProgram: newProgram.nameAr
            },
          });
          
          console.log(`✅ تم تطبيق ${feesResult.appliedFeesCount} رسوم دراسية للمتدرب المحول`);
        } else if (feesResult.alreadyAppliedCount > 0) {
          console.log(`ℹ️ جميع الرسوم مطبقة مسبقاً للمتدرب المحول`);
        }
        
      } catch (feesError) {
        console.error('Error applying fees after transfer:', feesError);
        // لا نوقف العملية إذا فشل تطبيق الرسوم
        // فقط نسجل الخطأ
        await this.auditService.log({
          action: AuditAction.CREATE,
          entity: 'TraineePayment',
          entityId: String(result.id),
          userId,
          details: { 
            message: `Failed to apply fees after transfer for trainee ${result.nameAr}`,
            error: feesError.message,
            transferOperation: true
          },
        });
      }

      return {
        success: true,
        message: 'تم تحويل المتدرب بنجاح',
        data: {
          traineeId: result.id,
          traineeName: result.nameAr,
          oldProgram: trainee.program.nameAr,
          newProgram: newProgram.nameAr
        }
      };

    } catch (error) {
      console.error('Error transferring trainee:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('حدث خطأ أثناء تحويل المتدرب');
    }
  }

  /**
   * تحويل بيانات المتدربين إلى تنسيق مناسب لـ Excel
   */
  private formatTraineesForExcel(trainees: any[], exportOptions: any, locationMaps?: {
    countryMap: Map<string, string>,
    governorateMap: Map<string, string>,
    cityMap: Map<string, string>
  }) {
    const headers = ['#', 'الاسم بالعربية', 'الاسم بالإنجليزية'];
    const rows = [];

    // إضافة الأعمدة حسب الخيارات المحددة مع التفاصيل المفصلة
    if (exportOptions.includePersonalData) {
      if (exportOptions.personalDataDetails?.nationalId) headers.push('الرقم القومي');
      if (exportOptions.personalDataDetails?.birthDate) headers.push('تاريخ الميلاد');
      if (exportOptions.personalDataDetails?.gender) headers.push('الجنس');
      if (exportOptions.personalDataDetails?.nationality) headers.push('الجنسية');
      if (exportOptions.personalDataDetails?.religion) headers.push('الديانة');
      if (exportOptions.personalDataDetails?.maritalStatus) headers.push('الحالة الاجتماعية');
      if (exportOptions.personalDataDetails?.idIssueDate) headers.push('تاريخ إصدار البطاقة');
      if (exportOptions.personalDataDetails?.idExpiryDate) headers.push('تاريخ انتهاء البطاقة');
    }

    if (exportOptions.includeContactData) {
      if (exportOptions.contactDataDetails?.phone) headers.push('رقم الهاتف');
      if (exportOptions.contactDataDetails?.email) headers.push('البريد الإلكتروني');
      if (exportOptions.contactDataDetails?.guardianPhone) headers.push('رقم هاتف ولي الأمر');
      if (exportOptions.contactDataDetails?.guardianEmail) headers.push('البريد الإلكتروني لولي الأمر');
      if (exportOptions.contactDataDetails?.guardianName) headers.push('اسم ولي الأمر');
    }

    if (exportOptions.includeAddressData) {
      if (exportOptions.addressDataDetails?.country) headers.push('الدولة');
      if (exportOptions.addressDataDetails?.governorate) headers.push('المحافظة');
      if (exportOptions.addressDataDetails?.city) headers.push('المدينة');
      if (exportOptions.addressDataDetails?.address) headers.push('العنوان');
      if (exportOptions.addressDataDetails?.residenceAddress) headers.push('عنوان الإقامة');
    }

    if (exportOptions.includeProgramData) {
      if (exportOptions.programDataDetails?.programName) headers.push('البرنامج التدريبي');
      if (exportOptions.programDataDetails?.programType) headers.push('نوع البرنامج');
      if (exportOptions.programDataDetails?.enrollmentType) headers.push('نوع الالتحاق');
      if (exportOptions.programDataDetails?.academicYear) headers.push('السنة الأكاديمية');
      if (exportOptions.programDataDetails?.classLevel) headers.push('المستوى الدراسي');
      if (exportOptions.programDataDetails?.traineeStatus) headers.push('حالة المتدرب');
    }

    if (exportOptions.includeAcademicData) {
      if (exportOptions.academicDataDetails?.educationType) headers.push('نوع التعليم');
      if (exportOptions.academicDataDetails?.schoolName) headers.push('اسم المدرسة/المعهد');
      if (exportOptions.academicDataDetails?.educationalAdministration) headers.push('الإدارة التعليمية');
      if (exportOptions.academicDataDetails?.graduationDate) headers.push('سنة التخرج');
      if (exportOptions.academicDataDetails?.totalGrade) headers.push('الدرجة الإجمالية');
      if (exportOptions.academicDataDetails?.gradePercentage) headers.push('نسبة الدرجة');
    }

    if (exportOptions.includeDistributionData) {
      headers.push('التوزيع النظري', 'التوزيع العملي');
    }

    // إضافة البيانات
    trainees.forEach((trainee, index) => {
      const row = [
        index + 1,
        trainee.nameAr,
        trainee.nameEn
      ];

      if (exportOptions.includePersonalData) {
        if (exportOptions.personalDataDetails?.nationalId) row.push(trainee.nationalId);
        if (exportOptions.personalDataDetails?.birthDate) row.push(trainee.birthDate ? new Date(trainee.birthDate).toLocaleDateString('ar-EG') : '');
        if (exportOptions.personalDataDetails?.gender) row.push(trainee.gender === 'MALE' ? 'ذكر' : 'أنثى');
        if (exportOptions.personalDataDetails?.nationality) row.push(trainee.nationality);
        if (exportOptions.personalDataDetails?.religion) {
          const religionLabels: Record<string, string> = {
            'ISLAM': 'مسلم',
            'CHRISTIANITY': 'مسيحي',
            'JUDAISM': 'يهودي'
          };
          row.push(religionLabels[trainee.religion] || trainee.religion || '');
        }
        if (exportOptions.personalDataDetails?.maritalStatus) row.push(
          trainee.maritalStatus === 'SINGLE' ? 'أعزب' : 
          trainee.maritalStatus === 'MARRIED' ? 'متزوج' :
          trainee.maritalStatus === 'DIVORCED' ? 'مطلق' : 'أرمل'
        );
        if (exportOptions.personalDataDetails?.idIssueDate) row.push(trainee.idIssueDate ? new Date(trainee.idIssueDate).toLocaleDateString('ar-EG') : '');
        if (exportOptions.personalDataDetails?.idExpiryDate) row.push(trainee.idExpiryDate ? new Date(trainee.idExpiryDate).toLocaleDateString('ar-EG') : '');
      }

      if (exportOptions.includeContactData) {
        if (exportOptions.contactDataDetails?.phone) row.push(trainee.phone);
        if (exportOptions.contactDataDetails?.email) row.push(trainee.email || '');
        if (exportOptions.contactDataDetails?.guardianPhone) row.push(trainee.guardianPhone);
        if (exportOptions.contactDataDetails?.guardianEmail) row.push(trainee.guardianEmail || '');
        if (exportOptions.contactDataDetails?.guardianName) row.push(trainee.guardianName || '');
      }

      if (exportOptions.includeAddressData) {
        if (exportOptions.addressDataDetails?.country) {
          row.push(locationMaps?.countryMap.get(trainee.country) || trainee.country);
        }
        if (exportOptions.addressDataDetails?.governorate) {
          row.push(trainee.governorate ? (locationMaps?.governorateMap.get(trainee.governorate) || trainee.governorate) : '');
        }
        if (exportOptions.addressDataDetails?.city) {
          row.push(locationMaps?.cityMap.get(trainee.city) || trainee.city);
        }
        if (exportOptions.addressDataDetails?.address) row.push(trainee.address);
        if (exportOptions.addressDataDetails?.residenceAddress) row.push(trainee.residenceAddress);
      }

      if (exportOptions.includeProgramData) {
        if (exportOptions.programDataDetails?.programName) row.push(trainee.program?.nameAr || '');
        if (exportOptions.programDataDetails?.programType) row.push(
          trainee.programType === 'SUMMER' ? 'صيفي' : 
          trainee.programType === 'WINTER' ? 'شتوي' : 'سنوي'
        );
        if (exportOptions.programDataDetails?.enrollmentType) row.push(
          trainee.enrollmentType === 'REGULAR' ? 'منتظم' :
          trainee.enrollmentType === 'DISTANCE' ? 'عن بُعد' : 'مختلط'
        );
        if (exportOptions.programDataDetails?.academicYear) row.push(trainee.academicYear);
        if (exportOptions.programDataDetails?.classLevel) row.push(trainee.classLevel);
        if (exportOptions.programDataDetails?.traineeStatus) row.push(
          trainee.traineeStatus === 'NEW' ? 'جديد' :
          trainee.traineeStatus === 'ACTIVE' ? 'نشط' :
          trainee.traineeStatus === 'GRADUATED' ? 'متخرج' : 'منسحب'
        );
      }

      if (exportOptions.includeAcademicData) {
        if (exportOptions.academicDataDetails?.educationType) {
          const educationTypeLabels: Record<string, string> = {
            'PREPARATORY': 'إعدادي',
            'INDUSTRIAL_SECONDARY': 'ثانوي فني صناعي',
            'COMMERCIAL_SECONDARY': 'ثانوي فني تجاري',
            'AGRICULTURAL_SECONDARY': 'ثانوي فني زراعي',
            'AZHAR_SECONDARY': 'ثانوي أزهري',
            'GENERAL_SECONDARY': 'ثانوي عام',
            'UNIVERSITY': 'بكالوريوس - ليسانس',
            'INDUSTRIAL_APPRENTICESHIP': 'تلمذة صناعية'
          };
          row.push(educationTypeLabels[trainee.educationType] || trainee.educationType || '');
        }
        if (exportOptions.academicDataDetails?.schoolName) row.push(trainee.schoolName || '');
        if (exportOptions.academicDataDetails?.educationalAdministration) row.push(trainee.educationalAdministration || '');
        if (exportOptions.academicDataDetails?.graduationDate) row.push(trainee.graduationDate ? new Date(trainee.graduationDate).getFullYear().toString() : '');
        if (exportOptions.academicDataDetails?.totalGrade) row.push(trainee.totalGrade || '');
        if (exportOptions.academicDataDetails?.gradePercentage) row.push(trainee.gradePercentage || '');
      }

      if (exportOptions.includeDistributionData) {
        // يمكن إضافة بيانات التوزيع هنا إذا كانت متاحة
        row.push('', ''); // مؤقتاً فارغ
      }

      rows.push(row);
    });

    return { headers, rows };
  }

  /**
   * إنشاء ملف Excel
   */
  private createExcelWorkbook(data: { headers: string[], rows: any[] }) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('بيانات المتدربين');

    // إضافة العناوين
    worksheet.addRow(data.headers);

    // تنسيق العناوين
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };

    // إضافة البيانات
    data.rows.forEach(row => {
      worksheet.addRow(row);
    });

    // تنسيق الأعمدة
    worksheet.columns.forEach((column: any) => {
      column.width = 15;
    });

    return workbook;
  }

  /**
   * إنشاء استثناء موعد سداد لمتدرب
   */
  async createPaymentException(traineeId: number, exceptionData: any, userId: string) {
    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: { program: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // حساب الموعد النهائي المخصص
    let customFinalDeadline = null;
    if (exceptionData.customPaymentEndDate && exceptionData.customGracePeriodDays) {
      const endDate = new Date(exceptionData.customPaymentEndDate);
      endDate.setDate(endDate.getDate() + exceptionData.customGracePeriodDays);
      customFinalDeadline = endDate;
    }

    // إنشاء الاستثناء
    const exception = await this.prisma.traineePaymentException.create({
      data: {
        traineeId,
        feeId: exceptionData.feeId || null,
        customPaymentEndDate: exceptionData.customPaymentEndDate ? new Date(exceptionData.customPaymentEndDate) : null,
        customGracePeriodDays: exceptionData.customGracePeriodDays || 0,
        customFinalDeadline,
        reason: exceptionData.reason,
        notes: exceptionData.notes,
        createdBy: userId,
      },
      include: {
        trainee: { select: { nameAr: true } },
        fee: { select: { name: true } }
      }
    });

    // تسجيل العملية
    await this.auditService.log({
      action: AuditAction.CREATE,
      entity: 'TraineePaymentException',
      entityId: exception.id,
      userId,
      details: {
        message: `إنشاء استثناء موعد سداد للمتدرب ${trainee.nameAr}`,
        feeId: exception.feeId,
        customDeadline: customFinalDeadline
      },
    });

    return exception;
  }

  /**
   * الحصول على استثناءات المتدرب
   */
  async getTraineePaymentExceptions(traineeId: number) {
    return this.prisma.traineePaymentException.findMany({
      where: { traineeId },
      include: {
        fee: { select: { name: true, amount: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deletePaymentException(exceptionId: string, userId: string) {
    // 1. التحقق من وجود الاستثناء
    const exception = await this.prisma.traineePaymentException.findUnique({
      where: { id: exceptionId },
      include: {
        trainee: { select: { nameAr: true } },
        fee: { select: { name: true } }
      }
    });

    if (!exception) {
      throw new NotFoundException('الاستثناء غير موجود');
    }

    // 2. حذف الاستثناء
    await this.prisma.traineePaymentException.delete({
      where: { id: exceptionId }
    });

    // 3. تسجيل العملية في Audit Log
    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'traineePaymentException',
      entityId: exceptionId,
      userId,
      details: toJsonValue({
        deleted: {
          trainee: exception.trainee.nameAr,
          fee: exception.fee?.name || 'جميع الرسوم',
          reason: exception.reason
        }
      }),
    });

    return { message: 'تم حذف الاستثناء بنجاح' };
  }

  async getTraineeFeesWithSchedules(traineeId: number) {
    // 1. التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { id: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // 2. جلب جميع TraineeFee IDs التي لها جداول سداد
    const paymentSchedules = await this.prisma.feePaymentSchedule.findMany({
      select: {
        feeId: true // هذا TraineeFee.id
      }
    });

    const traineeFeeIds = [...new Set(paymentSchedules.map(s => s.feeId))];

    if (traineeFeeIds.length === 0) {
      return [];
    }

    // 3. جلب مدفوعات المتدرب (TraineePayment) التي تخص هذه الرسوم
    const traineeFeesWithSchedules = await this.prisma.traineePayment.findMany({
      where: {
        traineeId,
        feeId: { in: traineeFeeIds } // TraineeFee IDs
      },
      include: {
        fee: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // 4. إرجاع القائمة مع معلومات جداول السداد
    return traineeFeesWithSchedules.map(payment => ({
      id: payment.feeId,
      name: payment.fee.name,
      amount: payment.fee.amount,
      paidAmount: payment.paidAmount,
      remainingAmount: payment.fee.amount - payment.paidAmount,
      status: payment.status,
      hasSchedule: true
    }));
  }

  /**
   * تحميل جميع وثائق المتدرب كملف ZIP
   */
  async downloadTraineeArchive(traineeId: number, userId: string) {
    const fs = require('fs');
    const path = require('path');
    const AdmZip = require('adm-zip');
    const https = require('https');
    const http = require('http');

    // التحقق من وجود المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { id: true, nameAr: true, photoUrl: true }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // جلب جميع وثائق المتدرب
    const documents = await this.prisma.traineeDocument.findMany({
      where: { traineeId },
      orderBy: { uploadedAt: 'desc' }
    });

    if (documents.length === 0 && !trainee.photoUrl) {
      throw new NotFoundException('لا توجد وثائق لهذا المتدرب');
    }

    // إنشاء ملف ZIP
    const zip = new AdmZip();

    console.log('📁 عدد الوثائق المسجلة:', documents.length);
    console.log('📷 الصورة الشخصية:', trainee.photoUrl);

    // دالة مساعدة لتحميل صورة من URL
    const downloadImageFromUrl = async (url: string): Promise<Buffer> => {
      return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        }).on('error', reject);
      });
    };

    // إضافة الصورة الشخصية إذا كانت موجودة
    if (trainee.photoUrl) {
      try {
        if (trainee.photoUrl.startsWith('http://') || trainee.photoUrl.startsWith('https://')) {
          console.log('🌐 تحميل الصورة الشخصية من Cloudinary');
          const photoBuffer = await downloadImageFromUrl(trainee.photoUrl);
          zip.addFile('01_الصورة_الشخصية.jpg', photoBuffer);
          console.log('✅ تمت إضافة الصورة الشخصية من Cloudinary');
        } else {
          // محاولات مختلفة للمسارات المحلية
          const attempts = [
            path.join(process.cwd(), '..', 'public', trainee.photoUrl),
            path.join(process.cwd(), 'public', trainee.photoUrl),
          ];
          
          let found = false;
          for (const attempt of attempts) {
            if (fs.existsSync(attempt)) {
              const photoBuffer = fs.readFileSync(attempt);
              zip.addFile('01_الصورة_الشخصية.jpg', photoBuffer);
              console.log(`✅ تمت إضافة الصورة الشخصية من: ${attempt}`);
              found = true;
              break;
            }
          }
          
          if (!found) {
            console.warn(`❌ لم يتم العثور على الصورة الشخصية`);
          }
        }
      } catch (error) {
        console.error('خطأ في إضافة الصورة الشخصية:', error);
      }
    }

    // إضافة باقي الوثائق - جميع الأنواع
    const documentTypeNames = {
      'PERSONAL_PHOTO': '01_الصورة_الشخصية',
      'ID_CARD_FRONT': '02_البطاقة_وجه',
      'ID_CARD_BACK': '03_البطاقة_ظهر',
      'QUALIFICATION_FRONT': '04_المؤهل_وجه',
      'QUALIFICATION_BACK': '05_المؤهل_ظهر',
      'EXPERIENCE_CERT': '06_شهادة_الخبرة',
      'MINISTRY_CERT': '07_شهادة_الوزارة',
      'PROFESSION_CARD': '08_كارنيه_المهنة',
      'SKILL_CERT': '09_شهادة_المهارة',
    };

    console.log(`📄 بدء معالجة ${documents.length} وثيقة`);

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      try {
        let filePath = doc.filePath;
        
        console.log(`📄 [${i+1}/${documents.length}] معالجة وثيقة: ${doc.documentType}, المسار: ${filePath}`);
        
        // تحميل من Cloudinary أو URLs خارجية
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          console.log(`🌐 تحميل من URL: ${filePath}`);
          try {
            const imageBuffer = await downloadImageFromUrl(filePath);
            const fileExtension = path.extname(doc.fileName) || '.jpg';
            // استخدام رقم تسلسلي إذا لم يكن النوع معروف
            const docName = documentTypeNames[doc.documentType] || `${String(i+1).padStart(2, '0')}_${doc.documentType}`;
            const fileName = `${docName}${fileExtension}`;
            
            zip.addFile(fileName, imageBuffer);
            console.log(`✅ [${i+1}/${documents.length}] تمت إضافة الملف من Cloudinary: ${fileName}`);
          } catch (downloadError) {
            console.error(`❌ فشل تحميل الصورة من URL:`, downloadError);
          }
          continue;
        }
        
        // معالجة الملفات المحلية
        const attempts = [
          path.join(process.cwd(), '..', 'public', filePath),
          path.join(process.cwd(), 'public', filePath),
          path.join(process.cwd(), '..', filePath),
          path.join(process.cwd(), filePath),
        ];
        
        let found = false;
        for (const attempt of attempts) {
          if (fs.existsSync(attempt)) {
            const fileBuffer = fs.readFileSync(attempt);
            const fileExtension = path.extname(doc.fileName) || '.jpg';
            // استخدام رقم تسلسلي إذا لم يكن النوع معروف
            const docName = documentTypeNames[doc.documentType] || `${String(i+1).padStart(2, '0')}_${doc.documentType}`;
            const fileName = `${docName}${fileExtension}`;
            
            zip.addFile(fileName, fileBuffer);
            console.log(`✅ [${i+1}/${documents.length}] تمت إضافة الملف المحلي: ${fileName}`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          console.warn(`❌ الملف غير موجود: ${doc.filePath}`);
        }
      } catch (error) {
        console.error(`❌ [${i+1}/${documents.length}] خطأ في إضافة الوثيقة ${doc.documentType}:`, error);
      }
    }

    // عد الملفات المضافة فعلياً
    const zipEntries = zip.getEntries();
    console.log(`📦 إجمالي الملفات في الـ ZIP: ${zipEntries.length}`);
    console.log(`📋 قائمة الملفات:`, zipEntries.map(e => e.entryName));

    // تسجيل العملية
    await this.auditService.log({
      action: AuditAction.CREATE,
      entity: 'TraineeArchive',
      entityId: String(traineeId),
      userId,
      details: {
        message: `تحميل أرشيف وثائق المتدرب ${trainee.nameAr}`,
        documentsCount: documents.length,
        filesInZip: zipEntries.length
      },
    });

    // إرجاع buffer الملف المضغوط
    const zipBuffer = zip.toBuffer();
    console.log(`✅ تم إنشاء ملف ZIP، الحجم: ${zipBuffer.length} بايت`);
    return zipBuffer;
  }

  async bulkDownloadArchives(programId: number | null, documentTypes: string[], userId: string): Promise<Buffer> {
    const fs = require('fs');
    const path = require('path');
    const AdmZip = require('adm-zip');
    const https = require('https');
    const http = require('http');

    const downloadImageFromUrl = async (url: string): Promise<Buffer> => {
      return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        }).on('error', reject);
      });
    };

    const where: any = {};
    if (programId) where.programId = programId;

    console.log(`📦 تحميل أرشيفات جماعية - البرنامج: ${programId || 'الكل'}, أنواع الوثائق: ${documentTypes.length}`);

    const trainees = await this.prisma.trainee.findMany({
      where,
      include: { documents: true },
      // بدون take للحصول على جميع المتدربين
    });

    console.log(`📊 عدد المتدربين: ${trainees.length}`);

    const mainZip = new AdmZip();
    let successCount = 0;
    let errorCount = 0;

    for (const trainee of trainees) {
      try {
        let addedCount = 0;
        
        // 1. إضافة الصورة الشخصية من photoUrl
        if (trainee.photoUrl && (!documentTypes.length || documentTypes.includes('PERSONAL_PHOTO'))) {
          try {
            let buffer: Buffer | null = null;
            
            if (trainee.photoUrl.startsWith('http')) {
              buffer = await downloadImageFromUrl(trainee.photoUrl);
            } else {
              const attempts = [
                path.join(process.cwd(), '..', 'public', trainee.photoUrl),
                path.join(process.cwd(), 'public', trainee.photoUrl),
              ];
              
              for (const attempt of attempts) {
                if (fs.existsSync(attempt)) {
                  buffer = fs.readFileSync(attempt);
                  break;
                }
              }
            }
            
            if (buffer) {
              mainZip.addFile(`${trainee.nameAr}_${trainee.id}/01_الصورة_الشخصية.jpg`, buffer);
              addedCount++;
            }
          } catch (photoErr) {
            console.error(`فشل صورة ${trainee.id}`);
          }
        }
        
        // 2. إضافة باقي الوثائق
        const filteredDocs = documentTypes.length > 0
          ? trainee.documents.filter(doc => documentTypes.includes(doc.documentType))
          : trainee.documents;
        
        for (const doc of filteredDocs) {
          try {
            let buffer: Buffer | null = null;
            const ext = doc.fileName.split('.').pop() || 'jpg';
            
            if (doc.filePath.startsWith('http')) {
              buffer = await downloadImageFromUrl(doc.filePath);
            } else {
              const attempts = [
                path.join(process.cwd(), '..', 'public', doc.filePath),
                path.join(process.cwd(), 'public', doc.filePath),
              ];
              
              for (const attempt of attempts) {
                if (fs.existsSync(attempt)) {
                  buffer = fs.readFileSync(attempt);
                  break;
                }
              }
            }
            
            if (buffer) {
              mainZip.addFile(`${trainee.nameAr}_${trainee.id}/${doc.documentType}.${ext}`, buffer);
              addedCount++;
            }
          } catch (err) {
            console.error(`فشل ${doc.documentType}`);
          }
        }
        
        if (addedCount > 0) successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    console.log(`✅ نجح: ${successCount}, ❌ فشل: ${errorCount}, 📦 إجمالي: ${trainees.length}`);

    return mainZip.toBuffer();
  }
}