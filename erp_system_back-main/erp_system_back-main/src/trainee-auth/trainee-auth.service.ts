import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../audit/audit.service';
import { SessionTrackingService } from './session-tracking.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class TraineeAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private whatsappService: UnifiedWhatsAppService,
    private settingsService: SettingsService,
    private auditService: AuditService,
    private sessionTrackingService: SessionTrackingService,
  ) {}

  private formatPhoneNumber(phoneNumber: string): string {
    // إزالة الأحرف غير الرقمية والمسافات
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // إذا كان الرقم يبدأ بـ 20، نحتفظ به كما هو
    if (cleaned.startsWith('20')) {
      return cleaned;
    }
    
    // إذا كان الرقم يبدأ بـ 0، نستبدله بـ 20
    if (cleaned.startsWith('0')) {
      cleaned = '20' + cleaned.substring(1);
    }
    
    // إذا كان الرقم لا يحتوي على كود الدولة، نضيف 20
    if (cleaned.length === 10) {
      cleaned = '20' + cleaned;
    }

    return cleaned;
  }

  private async buildResetCodeMessage(traineeName: string, resetCode: string): Promise<string> {
    return `🔐 مرحباً ${traineeName}

كود إعادة تعيين كلمة المرور الخاصة بك في منصة المتدربين:

*${resetCode}*

⏰ هذا الكود صالح لمدة 15 دقيقة فقط
🔒 لا تشارك هذا الكود مع أي شخص آخر

إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة.

مع تحيات فريق منصة المتدربين 🎓`;
  }

  async validateTrainee(nationalId: string, password: string): Promise<any> {
    // البحث عن المتدرب بالرقم القومي
    const traineeAuth = await this.prisma.traineeAuth.findUnique({
      where: { nationalId },
      include: {
        trainee: true, // تضمين بيانات المتدرب
      },
    });

    if (!traineeAuth) {
      return null;
    }

    // التحقق من وجود كلمة مرور (قد تكون null في البداية)
    if (!traineeAuth.password) {
      throw new UnauthorizedException('يجب إنشاء كلمة مرور أولاً');
    }

    // التحقق من كلمة المرور
    if (await bcrypt.compare(password, traineeAuth.password)) {
      const { password: _, ...result } = traineeAuth;
      return result;
    }

    return null;
  }

  async login(traineeAuth: any, req?: any) {
    const payload = {
      sub: traineeAuth.id,
      nationalId: traineeAuth.nationalId,
      traineeId: traineeAuth.traineeId,
      type: 'trainee', // تمييز نوع المستخدم
    };

    console.log('🔐 Trainee login attempt:', traineeAuth.id, traineeAuth.trainee?.nameAr);

    // تحديث آخر تسجيل دخول
    await this.prisma.traineeAuth.update({
      where: { id: traineeAuth.id },
      data: { lastLoginAt: new Date() },
    });

    // إنشاء جلسة تتبع جديدة
    let session = null;
    try {
      session = await this.sessionTrackingService.createSession(traineeAuth.id, req || {});
      console.log('✅ Session created:', session.sessionToken);
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      // المتابعة حتى لو فشل إنشاء الجلسة
    }

    // تسجيل audit log لتسجيل الدخول الناجح
    try {
      await this.auditService.log({
        userId: traineeAuth.id,
        entity: 'TraineeAuth',
        entityId: traineeAuth.id,
        action: 'LOGIN_SUCCESS',
        details: `Trainee ${traineeAuth.trainee?.nameAr || 'Unknown'} logged in successfully`
      });
    } catch (error) {
      console.error('❌ Failed to log audit:', error);
    }

    return {
      access_token: this.jwtService.sign(payload),
      trainee: traineeAuth.trainee,
      sessionToken: session?.sessionToken || null, // إرجاع session token للتتبع
    };
  }

  /**
   * تسجيل الخروج وإنهاء الجلسة
   */
  async logout(sessionToken: string) {
    if (!sessionToken) {
      throw new BadRequestException('Session token is required');
    }

    const session = await this.sessionTrackingService.endSession(sessionToken);
    
    if (session) {
      // تسجيل audit log لتسجيل الخروج
      await this.auditService.log({
        userId: session.traineeAuthId,
        entity: 'TraineeAuth',
        entityId: session.traineeAuthId,
        action: 'LOGOUT_SUCCESS',
        details: `Trainee logged out successfully. Session duration: ${session.duration}s`
      });
    }

    return { message: 'تم تسجيل الخروج بنجاح' };
  }

  /**
   * تسجيل نشاط للمتدرب
   */
  async trackActivity(
    sessionToken: string,
    activityType: string,
    page?: string,
    action?: string,
    metadata?: any
  ) {
    return this.sessionTrackingService.trackActivity(
      sessionToken,
      activityType,
      page,
      action,
      metadata
    );
  }

  /**
   * جلب إحصائيات متقدمة للمتدرب
   */
  async getAdvancedStats(traineeAuthId: string) {
    return this.sessionTrackingService.getAdvancedStats(traineeAuthId);
  }

  /**
   * تحديث نشاط الجلسة (heartbeat)
   */
  async updateSessionActivity(sessionToken: string) {
    if (!sessionToken) {
      throw new BadRequestException('Session token is required');
    }

    return this.sessionTrackingService.updateSessionActivity(sessionToken);
  }

  async getProfile(traineeAuthId: string) {
    console.log('🔍 Backend: Getting profile for traineeAuthId:', traineeAuthId);
    
    const traineeAuth = await this.prisma.traineeAuth.findUnique({
      where: { id: traineeAuthId },
      include: {
        trainee: {
          include: {
            program: true,
            attendanceRecords: {
              include: {
                session: {
                  include: {
                    content: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 10, // آخر 10 سجلات حضور
            },
            traineePayments: {
              include: {
                fee: {
                  include: {
                    paymentSchedule: true, // إضافة جدول مواعيد السداد
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              // إزالة الحد لجلب جميع الرسوم
            },
            documents: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!traineeAuth) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    console.log('📸 Backend: Trainee photoUrl:', traineeAuth.trainee?.photoUrl);
    console.log('👤 Backend: Trainee name:', traineeAuth.trainee?.nameAr);
    console.log('📄 Backend: Documents count:', traineeAuth.trainee?.documents?.length);
    console.log('📄 Backend: Documents data:', traineeAuth.trainee?.documents?.map(doc => ({
      type: doc.documentType,
      isVerified: doc.isVerified,
      fileName: doc.fileName
    })));

    const { password, resetCode, resetCodeExpiresAt, resetCodeGeneratedAt, ...result } = traineeAuth;
    return result;
  }

  async getMySchedule(traineeId: number) {
    console.log('📅 Getting schedule for trainee:', traineeId);
    
    // الحصول على المتدرب والبرنامج الخاص به
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: {
        programId: true,
        classLevel: true,
      },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // تحديد الفصل الدراسي الحالي
    // الأولوية: 1) الفصل النشط حسب التاريخ  2) أحدث فصل للدرجات  3) أي فصل بجدول
    const now = new Date();
    
    // جلب جميع فصول البرنامج
    const allClassrooms = await this.prisma.classroom.findMany({
      where: { programId: trainee.programId },
      select: {
        id: true,
        name: true,
        classNumber: true,
        startDate: true,
        endDate: true,
        _count: { select: { scheduleSlots: true } },
      },
      orderBy: { classNumber: 'asc' },
    });

    if (allClassrooms.length === 0) {
      return {
        success: false,
        message: 'لم يتم إنشاء فصول دراسية للبرنامج التدريبي بعد',
        schedule: null,
        classroom: null,
      };
    }

    let classroomId: number;
    let classroom: any;
    let found = false;

    // محاولة 1: الفصل الحالي حسب التاريخ (التاريخ بين startDate و endDate) ولديه جدول
    const activeByDate = allClassrooms.find(c => {
      if (!c.startDate || !c.endDate) return false;
      return now >= c.startDate && now <= c.endDate && c._count.scheduleSlots > 0;
    });

    if (activeByDate) {
      classroomId = activeByDate.id;
      classroom = activeByDate;
      found = true;
      console.log('✅ Found active classroom by date:', classroom.name);
    }

    // محاولة 2: إذا لم يوجد فصل حالي بالتاريخ، نبحث عن أقرب فصل لم يبدأ بعد ولديه جدول
    if (!found) {
      const futureWithSchedule = allClassrooms
        .filter(c => c.startDate && now < c.startDate && c._count.scheduleSlots > 0)
        .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
      
      if (futureWithSchedule.length > 0) {
        classroomId = futureWithSchedule[0].id;
        classroom = futureWithSchedule[0];
        found = true;
        console.log('✅ Found upcoming classroom with schedule:', classroom.name);
      }
    }

    // محاولة 3: أحدث فصل انتهى ولديه جدول
    if (!found) {
      const pastWithSchedule = allClassrooms
        .filter(c => c.endDate && now > c.endDate && c._count.scheduleSlots > 0)
        .sort((a, b) => b.endDate!.getTime() - a.endDate!.getTime());
      
      if (pastWithSchedule.length > 0) {
        classroomId = pastWithSchedule[0].id;
        classroom = pastWithSchedule[0];
        found = true;
        console.log('✅ Found most recent past classroom with schedule:', classroom.name);
      }
    }

    // محاولة 4: من سجل الدرجات
    if (!found) {
      const traineeGrade = await this.prisma.traineeGrades.findFirst({
        where: { traineeId },
        select: {
          classroomId: true,
          classroom: {
            select: {
              id: true,
              name: true,
              classNumber: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (traineeGrade) {
        classroomId = traineeGrade.classroomId;
        classroom = traineeGrade.classroom;
        found = true;
        console.log('✅ Found classroom from grades:', classroom.name);
      }
    }

    // محاولة 5: أي فصل لديه جدول
    if (!found) {
      const anyWithSchedule = allClassrooms.find(c => c._count.scheduleSlots > 0);
      if (anyWithSchedule) {
        classroomId = anyWithSchedule.id;
        classroom = anyWithSchedule;
        found = true;
        console.log('✅ Found any classroom with schedule:', classroom.name);
      }
    }

    if (!found) {
      return {
        success: false,
        message: 'لم يتم تعيين جدول دراسي للبرنامج بعد',
        schedule: null,
        classroom: allClassrooms[0],
      };
    }

    // الحصول على التاريخ والوقت الحالي
    console.log('📅 Current Date/Time:', now.toISOString());

    // البحث عن المجموعات التي ينتمي إليها المتدرب (إن وجدت)
    // نبحث أولاً عن توزيعات خاصة بالفصل الدراسي الحالي، وإن لم توجد نستخدم التوزيعات العامة
    const traineeDistributions = await this.prisma.distributionAssignment.findMany({
      where: {
        traineeId,
        room: {
          distribution: {
            programId: trainee.programId,
            classroomId: classroomId, // توزيعات الفصل الدراسي الحالي
          },
        },
      },
      select: {
        roomId: true,
        room: {
          select: {
            id: true,
            roomName: true,
            roomNumber: true,
            distribution: {
              select: {
                type: true, // THEORY أو PRACTICAL
                classroomId: true,
              },
            },
          },
        },
      },
    });

    // إذا لم توجد توزيعات للفصل الحالي، نبحث عن التوزيعات العامة (بدون فصل)
    let finalDistributions = traineeDistributions;
    if (traineeDistributions.length === 0) {
      console.log('⚠️  No classroom-specific distributions found, checking general distributions...');
      finalDistributions = await this.prisma.distributionAssignment.findMany({
        where: {
          traineeId,
          room: {
            distribution: {
              programId: trainee.programId,
              classroomId: null, // توزيعات عامة (بدون فصل)
            },
          },
        },
        select: {
          roomId: true,
          room: {
            select: {
              id: true,
              roomName: true,
              roomNumber: true,
              distribution: {
                select: {
                  type: true,
                  classroomId: true,
                },
              },
            },
          },
        },
      });
    }

    // إنشاء map للمجموعات حسب النوع (دعم توزيعات متعددة)
    const traineeRoomsByType = new Map<string, Set<string>>();
    finalDistributions.forEach((assignment) => {
      const type = assignment.room.distribution.type;
      if (!traineeRoomsByType.has(type)) {
        traineeRoomsByType.set(type, new Set<string>());
      }
      traineeRoomsByType.get(type)!.add(assignment.roomId);
    });

    console.log('👥 Trainee distribution assignments:');
    if (finalDistributions.length > 0) {
      finalDistributions.forEach((assignment) => {
        const classroomLabel = assignment.room.distribution.classroomId ? `(classroom: ${assignment.room.distribution.classroomId})` : '(general)';
        console.log(
          `   - ${assignment.room.distribution.type}: ${assignment.room.roomName} ${classroomLabel} (ID: ${assignment.roomId})`
        );
      });
      console.log('📋 Rooms by type:');
      traineeRoomsByType.forEach((roomIds, type) => {
        console.log(`   - ${type}: ${Array.from(roomIds).join(', ')}`);
      });
    } else {
      console.log('   - No specific room assignments (will see all general slots)');
    }

    // الحصول على جميع الفترات (slots) للفصل الدراسي مع الجلسات
    const allSlots = await this.prisma.scheduleSlot.findMany({
      where: { classroomId },
      include: {
        content: {
          select: {
            id: true,
            code: true,
            name: true,
            instructor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        distributionRoom: {
          select: {
            id: true,
            roomName: true,
            roomNumber: true,
          },
        },
        // جلب أول جلسة قادمة (ملغاة أو فعالة)
        sessions: {
          where: {
            date: {
              gte: now, // من الآن فصاعداً
            },
          },
          select: {
            id: true,
            date: true,
            isCancelled: true,
            cancellationReason: true,
          },
          orderBy: {
            date: 'asc', // الأقرب أولاً
          },
          take: 2, // جلب أول محاضرتين لضمان وجود فعالة إذا كانت الأولى ملغاة
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    console.log(`📊 Total slots in classroom: ${allSlots.length}`);

    // تصفية الحصص حسب مجموعة المتدرب
    const slots = allSlots.filter((slot) => {
      // إذا لم يكن للحصة مجموعة محددة، فهي عامة للجميع
      if (!slot.distributionRoomId) {
        console.log(`   ✅ Including general slot: ${slot.content.name} (${slot.type})`);
        return true;
      }

      // إذا كان للحصة مجموعة محددة، تحقق من أن المتدرب في إحدى هذه المجموعات
      const slotType = slot.type; // THEORY أو PRACTICAL
      const traineeRoomIds = traineeRoomsByType.get(slotType);

      // إذا لم يكن للمتدرب أي توزيع من هذا النوع، لا يرى الحصة
      if (!traineeRoomIds || traineeRoomIds.size === 0) {
        console.log(
          `   ⏭️  Skipping slot: ${slot.content.name} (${slotType}) - No ${slotType} distribution`
        );
        return false;
      }

      // المتدرب في واحدة من المجموعات؟
      const isInAnyRoom = traineeRoomIds.has(slot.distributionRoomId);

      if (!isInAnyRoom) {
        console.log(
          `   ⏭️  Skipping slot: ${slot.content.name} (${slotType}) - Different room (Expected: ${Array.from(traineeRoomIds).join(' or ')}, Got: ${slot.distributionRoomId})`
        );
      } else {
        console.log(
          `   ✅ Including slot: ${slot.content.name} (${slotType}) - Room matches!`
        );
      }

      return isInAnyRoom;
    });

    console.log(`✅ Slots for this trainee: ${slots.length}`);

    // تنظيم البيانات حسب اليوم
    const weekSchedule: any = {
      SUNDAY: [],
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
    };

    slots.forEach((slot) => {
      // فصل المحاضرات الملغاة عن الفعالة
      let nextActiveSession = null;
      let nextCancelledSession = null;

      if (slot.sessions.length > 0) {
        // البحث عن أول محاضرة فعالة
        nextActiveSession = slot.sessions.find(s => !s.isCancelled) || null;
        // البحث عن أول محاضرة ملغاة
        nextCancelledSession = slot.sessions.find(s => s.isCancelled) || null;

        if (nextActiveSession) {
          console.log(`✅ Next active session found for ${slot.content.name} (${slot.dayOfWeek}):`);
          console.log('   Session date:', nextActiveSession.date);
        }

        if (nextCancelledSession) {
          console.log(`🔴 Next cancelled session found for ${slot.content.name} (${slot.dayOfWeek}):`);
          console.log('   Session date:', nextCancelledSession.date);
          console.log('   Reason:', nextCancelledSession.cancellationReason);
        }
      }

      weekSchedule[slot.dayOfWeek].push({
        id: slot.id,
        content: slot.content,
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: slot.type, // THEORY أو PRACTICAL
        location: slot.location,
        distributionRoom: slot.distributionRoom,
        // معلومات المحاضرة القادمة (فعالة أو ملغاة)
        nextActiveSession: nextActiveSession ? {
          date: nextActiveSession.date,
        } : null,
        nextCancelledSession: nextCancelledSession ? {
          date: nextCancelledSession.date,
          cancellationReason: nextCancelledSession.cancellationReason,
        } : null,
      });
    });

    console.log('✅ Schedule found for classroom:', classroom.name);

    return {
      success: true,
      classroom: classroom,
      schedule: weekSchedule,
    };
  }

  async checkNationalId(nationalId: string): Promise<any> {
    // البحث عن المتدرب بالرقم القومي فقط
    const trainee = await this.prisma.trainee.findUnique({
      where: { nationalId },
    });

    if (!trainee) {
      throw new NotFoundException('أنت غير مسجل في قاعدة بيانات المركز');
    }

    // التحقق من وجود حساب مصادقة
    const existingAuth = await this.prisma.traineeAuth.findUnique({
      where: { traineeId: trainee.id },
    });

    const hasAccount = !!(existingAuth && existingAuth.password);

    return {
      exists: true,
      hasAccount,
      name: trainee.nameAr,
    };
  }

  async verifyTraineeForRegistration(nationalId: string, birthDate: string): Promise<any> {
    // البحث عن المتدرب بالرقم القومي وتاريخ الميلاد
    const trainee = await this.prisma.trainee.findFirst({
      where: {
        nationalId,
        birthDate: new Date(birthDate),
      },
    });

    if (!trainee) {
      throw new NotFoundException('لا يوجد متدرب بهذه البيانات');
    }

    // التحقق من وجود حساب مصادقة مسبقاً
    const existingAuth = await this.prisma.traineeAuth.findUnique({
      where: { traineeId: trainee.id },
    });

    if (existingAuth && existingAuth.password) {
      throw new BadRequestException('يوجد حساب مسجل مسبقاً بهذه البيانات');
    }

    // إضافة تلميح رقم الهاتف (آخر رقمين) للأمان
    const phoneHint = trainee.phone ? trainee.phone.slice(-2) : null;

    return {
      traineeId: trainee.id,
      nationalId: trainee.nationalId,
      name: trainee.nameAr,
      hasAccount: !!existingAuth,
      phoneHint: phoneHint, // آخر رقمين من رقم الهاتف
    };
  }

  async verifyTraineePhone(nationalId: string, phone: string): Promise<any> {
    // البحث عن المتدرب بالرقم القومي
    const trainee = await this.prisma.trainee.findUnique({
      where: { nationalId },
    });

    if (!trainee) {
      throw new NotFoundException('لا يوجد متدرب بهذا الرقم القومي');
    }

    // التحقق من تطابق رقم الهاتف
    // نتحقق من رقم الهاتف الأساسي أو الواتساب
    const phoneMatches = trainee.phone === phone || trainee.whatsapp === phone;

    if (!phoneMatches) {
      throw new BadRequestException('رقم الهاتف المدخل غير متطابق مع السجلات المسجلة لدينا في المركز');
    }

    return {
      success: true,
      message: 'تم التحقق من رقم الهاتف بنجاح',
    };
  }

  async createTraineePassword(nationalId: string, birthDate: string, password: string): Promise<any> {
    // التحقق من البيانات أولاً
    const trainee = await this.prisma.trainee.findFirst({
      where: {
        nationalId,
        birthDate: new Date(birthDate),
      },
    });

    if (!trainee) {
      throw new NotFoundException('بيانات المتدرب غير صحيحة');
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // البحث عن سجل المصادقة أو إنشاؤه
    let traineeAuth = await this.prisma.traineeAuth.findUnique({
      where: { traineeId: trainee.id },
    });

    if (traineeAuth) {
      // تحديث كلمة المرور
      traineeAuth = await this.prisma.traineeAuth.update({
        where: { id: traineeAuth.id },
        data: { 
          password: hashedPassword,
          isActive: true,
        },
      });
    } else {
      // إنشاء سجل مصادقة جديد
      traineeAuth = await this.prisma.traineeAuth.create({
        data: {
          nationalId,
          birthDate: new Date(birthDate),
          password: hashedPassword,
          traineeId: trainee.id,
          isActive: true,
        },
      });
    }

    return {
      success: true,
      message: 'تم إنشاء كلمة المرور بنجاح',
    };
  }

  async requestPasswordReset(nationalId: string, phone: string): Promise<any> {
    // البحث عن المتدرب بالرقم القومي
    const trainee = await this.prisma.trainee.findUnique({
      where: { nationalId },
    });

    if (!trainee) {
      throw new NotFoundException('لا يوجد متدرب مسجل بهذا الرقم القومي');
    }

    // التحقق من تطابق رقم الهاتف
    const phoneMatches = trainee.phone === phone || trainee.whatsapp === phone;
    if (!phoneMatches) {
      throw new BadRequestException('رقم الهاتف المدخل غير متطابق مع السجلات المسجلة لدينا في المركز');
    }

    // البحث عن حساب المصادقة أو إنشاؤه
    let traineeAuth = await this.prisma.traineeAuth.findUnique({
      where: { traineeId: trainee.id },
    });

    if (!traineeAuth) {
      // إنشاء حساب مصادقة جديد إذا لم يكن موجوداً
      traineeAuth = await this.prisma.traineeAuth.create({
        data: {
          nationalId: trainee.nationalId,
          birthDate: trainee.birthDate,
          traineeId: trainee.id,
          isActive: true,
        },
      });
    }

    // التحقق من الحد الزمني (3 دقائق)
    const now = new Date();
    if (traineeAuth.resetCodeGeneratedAt) {
      const timeDiff = now.getTime() - traineeAuth.resetCodeGeneratedAt.getTime();
      const threeMinutes = 3 * 60 * 1000; // 3 دقائق بالميلي ثانية
      
      if (timeDiff < threeMinutes) {
        const remainingTime = Math.ceil((threeMinutes - timeDiff) / 1000);
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        throw new BadRequestException(`يمكن طلب كود جديد خلال ${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }

    // توليد كود إعادة تعيين
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 دقيقة

    await this.prisma.traineeAuth.update({
      where: { id: traineeAuth.id },
      data: {
        resetCode,
        resetCodeExpiresAt,
        resetCodeGeneratedAt: new Date(),
      },
    });

    // إرسال الكود عبر الواتساب
    const whatsappPhone = trainee.whatsapp || trainee.phone;
    const formattedPhone = this.formatPhoneNumber(whatsappPhone);
    const message = await this.buildResetCodeMessage(trainee.nameAr, resetCode);
    
    const messageSent = await this.whatsappService.sendMessage(formattedPhone, message, traineeAuth.id);

    if (!messageSent) {
      // حذف الكود في حالة فشل الإرسال
      await this.prisma.traineeAuth.update({
        where: { id: traineeAuth.id },
        data: {
          resetCode: null,
          resetCodeExpiresAt: null,
          resetCodeGeneratedAt: null,
        },
      });
      throw new BadRequestException('فشل في إرسال كود التحقق عبر الواتساب، يرجى المحاولة لاحقاً');
    }

    return {
      success: true,
      message: 'تم إرسال كود إعادة تعيين كلمة المرور عبر الواتساب بنجاح',
      // في البيئة التطويرية فقط
      resetCode: process.env.NODE_ENV === 'development' ? resetCode : undefined,
    };
  }

  async verifyResetCode(nationalId: string, resetCode: string): Promise<any> {
    const traineeAuth = await this.prisma.traineeAuth.findUnique({
      where: { nationalId },
    });

    if (!traineeAuth) {
      throw new NotFoundException('لا يوجد حساب مرتبط بهذا الرقم القومي');
    }

    if (!traineeAuth.resetCode || traineeAuth.resetCode !== resetCode) {
      throw new BadRequestException('كود التحقق غير صحيح');
    }

    if (!traineeAuth.resetCodeExpiresAt || traineeAuth.resetCodeExpiresAt < new Date()) {
      throw new BadRequestException('كود التحقق منتهي الصلاحية');
    }

    return {
      success: true,
      message: 'كود التحقق صحيح',
    };
  }

  async resetPassword(nationalId: string, resetCode: string, newPassword: string): Promise<any> {
    // التحقق من الكود أولاً
    await this.verifyResetCode(nationalId, resetCode);

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.traineeAuth.update({
      where: { nationalId },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpiresAt: null,
        resetCodeGeneratedAt: null,
      },
    });

    return {
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
    };
  }

  async getMyAttendanceRecords(traineeId: number) {
    // جلب بيانات المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: {
        program: true,
      },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // جلب جميع الفصول الدراسية للبرنامج (حتى لو ليس بها سجلات حضور)
    const allClassrooms = await this.prisma.classroom.findMany({
      where: { programId: trainee.programId },
      orderBy: { classNumber: 'asc' },
      select: {
        id: true,
        name: true,
        classNumber: true,
        startDate: true,
        endDate: true,
      },
    });

    // جلب سجلات الحضور للبرنامج الحالي فقط (استبعاد المحاضرات الملغاة)
    const attendance = await this.prisma.attendance.findMany({
      where: {
        traineeId,
        session: {
          isCancelled: false,
          scheduleSlot: {
            classroom: {
              programId: trainee.programId,
            },
          },
        },
      },
      include: {
        session: {
          include: {
            scheduleSlot: {
              include: {
                content: true,
                classroom: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // حساب الإحصائيات العامة
    const totalSessions = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
    const absentCount = attendance.filter(a => a.status === 'ABSENT').length;
    const lateCount = attendance.filter(a => a.status === 'LATE').length;
    const excusedCount = attendance.filter(a => a.status === 'EXCUSED').length;
    const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    // إنشاء خريطة الفصول من جميع الفصول الدراسية (وليس فقط التي بها سجلات)
    const classroomMap: Record<number, {
      classroom: any;
      contentGroups: Record<number, any>;
      stats: { total: number; present: number; absent: number; late: number; excused: number; attendanceRate: number };
    }> = {};

    // تسجيل جميع الفصول الدراسية أولاً
    allClassrooms.forEach((cls) => {
      classroomMap[cls.id] = {
        classroom: {
          id: cls.id,
          name: cls.name,
          classNumber: cls.classNumber,
          startDate: cls.startDate,
          endDate: cls.endDate,
        },
        contentGroups: {},
        stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 },
      };
    });

    // توزيع سجلات الحضور على الفصول
    attendance.forEach((record) => {
      const classroomData = record.session.scheduleSlot.classroom;
      const content = record.session.scheduleSlot.content;
      const classroomId = classroomData.id;
      const contentId = content.id;

      // في حالة وجود فصل غير مسجل مسبقاً (نادر)
      if (!classroomMap[classroomId]) {
        classroomMap[classroomId] = {
          classroom: {
            id: classroomData.id,
            name: classroomData.name,
            classNumber: classroomData.classNumber,
            startDate: classroomData.startDate,
            endDate: classroomData.endDate,
          },
          contentGroups: {},
          stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 },
        };
      }

      const classroomGroup = classroomMap[classroomId];

      // تحديث إحصائيات الفصل
      classroomGroup.stats.total++;
      if (record.status === 'PRESENT') classroomGroup.stats.present++;
      if (record.status === 'ABSENT') classroomGroup.stats.absent++;
      if (record.status === 'LATE') classroomGroup.stats.late++;
      if (record.status === 'EXCUSED') classroomGroup.stats.excused++;

      // إنشاء مجموعة المادة داخل الفصل إن لم تكن موجودة
      if (!classroomGroup.contentGroups[contentId]) {
        classroomGroup.contentGroups[contentId] = {
          content: {
            id: content.id,
            nameAr: content.name,
            nameEn: content.name,
          },
          sessions: [],
          stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0, attendanceRate: 0 },
        };
      }

      const contentGroup = classroomGroup.contentGroups[contentId];

      contentGroup.sessions.push({
        id: record.id,
        sessionId: record.session.id,
        date: record.session.date,
        dayOfWeek: record.session.scheduleSlot.dayOfWeek,
        sessionType: record.session.scheduleSlot.type,
        status: record.status,
        isCancelled: record.session.isCancelled,
        notes: record.notes,
        createdAt: record.createdAt,
      });

      contentGroup.stats.total++;
      if (record.status === 'PRESENT') contentGroup.stats.present++;
      if (record.status === 'ABSENT') contentGroup.stats.absent++;
      if (record.status === 'LATE') contentGroup.stats.late++;
      if (record.status === 'EXCUSED') contentGroup.stats.excused++;
    });

    // حساب نسب الحضور وتحويل إلى مصفوفات
    const classroomGroups = Object.values(classroomMap).map((group) => {
      // نسبة حضور الفصل
      if (group.stats.total > 0) {
        group.stats.attendanceRate = Math.round((group.stats.present / group.stats.total) * 100);
      }

      // نسب حضور المواد داخل الفصل
      const contentGroups = Object.values(group.contentGroups).map((cg: any) => {
        if (cg.stats.total > 0) {
          cg.stats.attendanceRate = Math.round((cg.stats.present / cg.stats.total) * 100);
        }
        return cg;
      });

      return {
        classroom: group.classroom,
        contentGroups,
        stats: group.stats,
      };
    });

    // ترتيب حسب رقم الفصل (الأحدث أولاً)
    classroomGroups.sort((a, b) => b.classroom.classNumber - a.classroom.classNumber);

    // الحفاظ على contentGroups المسطحة للتوافق مع النسخة القديمة
    const flatContentGroups: any[] = [];
    classroomGroups.forEach((cg) => {
      cg.contentGroups.forEach((content: any) => {
        flatContentGroups.push(content);
      });
    });

    return {
      trainee: {
        id: trainee.id,
        nameAr: trainee.nameAr,
        nameEn: trainee.nameEn,
        nationalId: trainee.nationalId,
        photoUrl: trainee.photoUrl,
        program: trainee.program,
      },
      stats: {
        total: totalSessions,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        attendanceRate,
      },
      classroomGroups,
      contentGroups: flatContentGroups,
    };
  }

  // جلب درجات المتدرب منظمة حسب الفصل الدراسي
  async getMyGrades(traineeId: number) {
    // الحصول على معلومات المتدرب
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        nationalId: true,
        programId: true,
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
      throw new NotFoundException('المتدرب غير موجود');
    }

    // جلب جميع المحتوى التدريبي للبرنامج
    const allContents = await this.prisma.trainingContent.findMany({
      where: {
        programId: trainee.programId,
      },
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { classroom: { name: 'asc' } },
        { code: 'asc' },
      ],
    });

    // جلب الدرجات المسجلة للمتدرب
    const existingGrades = await this.prisma.traineeGrades.findMany({
      where: {
        traineeId,
      },
    });

    // إنشاء map للدرجات المسجلة للوصول السريع
    const gradesMap = new Map();
    existingGrades.forEach((grade) => {
      const key = `${grade.trainingContentId}_${grade.classroomId}`;
      gradesMap.set(key, grade);
    });

    // دمج المحتوى التدريبي مع الدرجات
    const grades = allContents.map((content) => {
      const key = `${content.id}_${content.classroomId}`;
      const grade = gradesMap.get(key);

      return {
        trainingContent: {
          id: content.id,
          code: content.code,
          name: content.name,
          yearWorkMarks: content.yearWorkMarks,
          practicalMarks: content.practicalMarks,
          writtenMarks: content.writtenMarks,
          attendanceMarks: content.attendanceMarks,
          quizzesMarks: content.quizzesMarks,
          finalExamMarks: content.finalExamMarks,
        },
        classroom: content.classroom,
        yearWorkMarks: grade?.yearWorkMarks || 0,
        practicalMarks: grade?.practicalMarks || 0,
        writtenMarks: grade?.writtenMarks || 0,
        attendanceMarks: grade?.attendanceMarks || 0,
        quizzesMarks: grade?.quizzesMarks || 0,
        finalExamMarks: grade?.finalExamMarks || 0,
        totalMarks: grade?.totalMarks || 0,
      };
    });

    // تجميع الدرجات حسب الفصل الدراسي
    const classroomGroups: { [key: string]: any } = {};
    let totalEarned = 0;
    let totalMax = 0;

    grades.forEach((grade) => {
      const classroomName = grade.classroom.name;
      
      if (!classroomGroups[classroomName]) {
        classroomGroups[classroomName] = {
          classroom: grade.classroom,
          contents: [],
          stats: {
            totalEarned: 0,
            totalMax: 0,
            contentCount: 0,
          },
        };
      }

      const maxMarks =
        (grade.trainingContent.yearWorkMarks || 0) +
        (grade.trainingContent.practicalMarks || 0) +
        (grade.trainingContent.writtenMarks || 0) +
        (grade.trainingContent.attendanceMarks || 0) +
        (grade.trainingContent.quizzesMarks || 0) +
        (grade.trainingContent.finalExamMarks || 0);

      // حساب المجموع من المكونات الفردية بدلاً من totalMarks المخزن لضمان الدقة
      const earnedMarks = 
        (Number(grade.yearWorkMarks) || 0) +
        (Number(grade.practicalMarks) || 0) +
        (Number(grade.writtenMarks) || 0) +
        (Number(grade.attendanceMarks) || 0) +
        (Number(grade.quizzesMarks) || 0) +
        (Number(grade.finalExamMarks) || 0);

      classroomGroups[classroomName].contents.push({
        content: grade.trainingContent,
        grades: {
          yearWorkMarks: grade.yearWorkMarks || 0,
          practicalMarks: grade.practicalMarks || 0,
          writtenMarks: grade.writtenMarks || 0,
          attendanceMarks: grade.attendanceMarks || 0,
          quizzesMarks: grade.quizzesMarks || 0,
          finalExamMarks: grade.finalExamMarks || 0,
          totalMarks: earnedMarks,
        },
        maxMarks: {
          yearWorkMarks: grade.trainingContent.yearWorkMarks || 0,
          practicalMarks: grade.trainingContent.practicalMarks || 0,
          writtenMarks: grade.trainingContent.writtenMarks || 0,
          attendanceMarks: grade.trainingContent.attendanceMarks || 0,
          quizzesMarks: grade.trainingContent.quizzesMarks || 0,
          finalExamMarks: grade.trainingContent.finalExamMarks || 0,
          total: maxMarks,
        },
        percentage: maxMarks > 0 ? (earnedMarks / maxMarks) * 100 : 0,
      });

      classroomGroups[classroomName].stats.totalEarned += earnedMarks;
      classroomGroups[classroomName].stats.totalMax += maxMarks;
      classroomGroups[classroomName].stats.contentCount += 1;

      totalEarned += earnedMarks;
      totalMax += maxMarks;
    });

    // حساب النسب المئوية لكل فصل
    Object.values(classroomGroups).forEach((group: any) => {
      group.stats.percentage =
        group.stats.totalMax > 0
          ? (group.stats.totalEarned / group.stats.totalMax) * 100
          : 0;
    });

    return {
      trainee: {
        id: trainee.id,
        nameAr: trainee.nameAr,
        nameEn: trainee.nameEn,
        nationalId: trainee.nationalId,
        program: trainee.program,
      },
      overallStats: {
        totalEarned: Number(totalEarned.toFixed(2)),
        totalMax: Number(totalMax.toFixed(2)),
        percentage: totalMax > 0 ? Number(((totalEarned / totalMax) * 100).toFixed(2)) : 0,
        totalContents: grades.length,
      },
      classrooms: Object.values(classroomGroups),
    };
  }
}
