import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionTrackingService } from '../trainee-auth/session-tracking.service';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';
import { SettingsService } from '../settings/settings.service';
import * as bcrypt from 'bcryptjs';
import { 
  UpdateTraineeAccountDto, 
  TraineeAccountQueryDto, 
  ResetTraineePasswordDto,
  TraineePlatformStatsQueryDto,
  TraineeTrackingQueryDto,
  TraineeSessionHistoryQueryDto
} from './dto/trainee-platform.dto';

@Injectable()
export class TraineePlatformService {
  constructor(
    private prisma: PrismaService,
    private sessionTrackingService: SessionTrackingService,
    private whatsappService: UnifiedWhatsAppService,
    private settingsService: SettingsService
  ) {}

  private normalizeSearchText(value?: string): string {
    if (!value) return '';

    // Normalize Arabic/English digits and collapse repeated spaces.
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const normalizedDigits = value
      .split('')
      .map((char) => {
        const idx = arabicDigits.indexOf(char);
        return idx >= 0 ? String(idx) : char;
      })
      .join('');

    return normalizedDigits.replace(/\s+/g, ' ').trim();
  }

  private buildAccountSearchTermConditions(term: string) {
    return [
      { trainee: { nameAr: { contains: term } } },
      { trainee: { nameEn: { contains: term } } },
      { trainee: { nationalId: { contains: term } } },
      { trainee: { email: { contains: term } } },
      { trainee: { phone: { contains: term } } },
      { nationalId: { contains: term } },
    ];
  }

  /**
   * جلب قائمة حسابات المتدربين مع إمكانية البحث والفلترة
   */
  async getTraineeAccounts(query: TraineeAccountQueryDto) {
    const {
      search,
      isActive,
      programId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.max(Math.min(Number(limit) || 10, 100), 1); // حد أقصى 100 عنصر
    const skip = (parsedPage - 1) * parsedLimit;
    const take = parsedLimit;
    const normalizedSearch = this.normalizeSearchText(search);
    const searchTerms = normalizedSearch
      ? Array.from(new Set(normalizedSearch.split(' ').filter(Boolean)))
      : [];

    // بناء شروط البحث
    const where: any = {};
    const andConditions: any[] = [];

    if (searchTerms.length > 0) {
      // Every term should be found in at least one searchable field.
      andConditions.push(
        ...searchTerms.map((term) => ({
          OR: this.buildAccountSearchTermConditions(term),
        })),
      );
    }

    const parsedIsActive =
      typeof isActive === 'boolean'
        ? isActive
        : typeof isActive === 'string'
          ? isActive === 'true'
          : undefined;

    if (typeof parsedIsActive === 'boolean') {
      andConditions.push({ isActive: parsedIsActive });
    }

    const parsedProgramId = Number(programId);
    if (!Number.isNaN(parsedProgramId) && parsedProgramId > 0) {
      andConditions.push({
        trainee: {
          programId: parsedProgramId,
        },
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const safeSortBy = ['createdAt', 'lastLoginAt', 'isActive', 'nationalId'].includes(String(sortBy))
      ? String(sortBy)
      : 'createdAt';
    const safeSortOrder: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    // جلب البيانات مع العدد الكلي
    const [traineeAccounts, total] = await Promise.all([
      this.prisma.traineeAuth.findMany({
        where,
        skip,
        take,
        orderBy: { [safeSortBy]: safeSortOrder },
        include: {
          trainee: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              nationalId: true,
              email: true,
              phone: true,
              photoUrl: true,
              program: {
                select: {
                  id: true,
                  nameAr: true,
                  nameEn: true,
                }
              },
              traineeStatus: true,
              classLevel: true,
              academicYear: true,
            }
          }
        }
      }),
      this.prisma.traineeAuth.count({ where })
    ]);

    return {
      data: traineeAccounts,
      meta: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
        hasNext: parsedPage * parsedLimit < total,
        hasPrev: parsedPage > 1,
      }
    };
  }

  /**
   * جلب حساب متدرب واحد بالتفصيل
   */
  async getTraineeAccountById(id: string) {
    const traineeAccount = await this.prisma.traineeAuth.findUnique({
      where: { id },
      include: {
        trainee: {
          include: {
            program: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
              }
            },
          }
        }
      }
    });

    if (!traineeAccount) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    return traineeAccount;
  }

  /**
   * جلب كلمة مرور حساب متدرب
   */
  async getTraineePassword(id: string) {
    const traineeAccount = await this.prisma.traineeAuth.findUnique({
      where: { id },
      select: {
        id: true,
        password: true,
      }
    });

    if (!traineeAccount) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    return {
      hasPassword: !!traineeAccount.password,
      message: 'كلمة المرور مشفرة ولا يمكن عرضها'
    };
  }

  /**
   * تحديث حساب متدرب
   */
  async updateTraineeAccount(id: string, updateData: UpdateTraineeAccountDto) {
    const traineeAccount = await this.prisma.traineeAuth.findUnique({
      where: { id }
    });

    if (!traineeAccount) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    const updatePayload: any = {};

    // تحديث كلمة المرور إذا تم توفيرها
    if (updateData.password) {
      updatePayload.password = await bcrypt.hash(updateData.password, 12);
    }

    // تحديث حالة التفعيل
    if (typeof updateData.isActive === 'boolean') {
      updatePayload.isActive = updateData.isActive;
    }

    // إضافة تاريخ التحديث
    updatePayload.updatedAt = new Date();

    return this.prisma.traineeAuth.update({
      where: { id },
      data: updatePayload,
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            nationalId: true,
            email: true,
            phone: true,
          }
        }
      }
    });
  }

  /**
   * إعادة تعيين كلمة مرور متدرب
   */
  async resetTraineePassword(id: string, resetData: ResetTraineePasswordDto) {
    const traineeAccount = await this.prisma.traineeAuth.findUnique({
      where: { id }
    });

    if (!traineeAccount) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    const hashedPassword = await bcrypt.hash(resetData.newPassword, 12);

    return this.prisma.traineeAuth.update({
      where: { id },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpiresAt: null,
        resetCodeGeneratedAt: null,
        updatedAt: new Date(),
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            nationalId: true,
          }
        }
      }
    });
  }

  /**
   * تفعيل أو تعطيل حساب متدرب
   */
  async toggleTraineeAccountStatus(id: string) {
    const traineeAccount = await this.prisma.traineeAuth.findUnique({
      where: { id },
      select: { isActive: true }
    });

    if (!traineeAccount) {
      throw new NotFoundException('حساب المتدرب غير موجود');
    }

    return this.prisma.traineeAuth.update({
      where: { id },
      data: {
        isActive: !traineeAccount.isActive,
        updatedAt: new Date(),
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            nationalId: true,
          }
        }
      }
    });
  }

  /**
   * نظام تتبع نشاط المتدربين الشامل - يستخدم الجداول الجديدة
   */
  async getTraineeTracking(query: TraineeTrackingQueryDto) {
    return this.sessionTrackingService.getTrackingDashboard(query);
  }

  /**
   * سجل جلسات متدرب محدد - يستخدم الجداول الجديدة
   */
  async getTraineeSessionHistory(traineeAuthId: string, query: TraineeSessionHistoryQueryDto) {
    return this.sessionTrackingService.getTraineeSessionHistory(traineeAuthId, query);
  }

  /**
   * جلب إحصائيات منصة المتدربين (قديم — يستدعي الطريقة الجديدة)
   */
  async getTraineePlatformStats(query: TraineePlatformStatsQueryDto) {
    return this.getTraineeTracking({ programId: query.programId });
  }

  /**
   * إنهاء الجلسات المنتهية الصلاحية وإعادة حساب المتوسطات
   */
  async expireInactiveSessions() {
    return this.sessionTrackingService.expireInactiveSessions();
  }



  /**
   * جلب آخر نشاط تسجيل دخول للمتدربين
   */
  async getRecentLoginActivity(limit: number = 20) {
    return this.prisma.traineeAuth.findMany({
      where: {
        lastLoginAt: { not: null }
      },
      orderBy: { lastLoginAt: 'desc' },
      take: limit,
      select: {
        id: true,
        lastLoginAt: true,
        trainee: {
          select: {
            nameAr: true,
            nameEn: true,
            nationalId: true,
            program: {
              select: {
                nameAr: true,
                nameEn: true,
              }
            }
          }
        }
      }
    });
  }

  /**
   * إرسال رسالة واتساب للمتدرب ببيانات تسجيل الدخول للمنصة
   */
  async sendPlatformCredentials(accountId: string, userId?: string): Promise<{ success: boolean; message: string }> {
    try {
      // جلب بيانات الحساب
      const account = await this.prisma.traineeAuth.findUnique({
        where: { id: accountId },
        include: {
          trainee: {
            include: {
              program: true
            }
          }
        }
      });

      if (!account) {
        throw new NotFoundException('حساب المتدرب غير موجود');
      }

      if (!account.trainee?.phone) {
        throw new BadRequestException('رقم هاتف المتدرب غير متوفر');
      }

      if (!account.isActive) {
        throw new BadRequestException('الحساب غير مفعل. يجب تفعيل الحساب أولاً');
      }

      // التحقق من جاهزية الواتساب
      const isReady = await this.whatsappService.isClientReallyReady();
      if (!isReady) {
        throw new BadRequestException('خدمة الواتساب غير متاحة حالياً. يرجى المحاولة لاحقاً');
      }

      // استخدام الرقم القومي ككلمة مرور
      const newPassword = account.trainee.nationalId;
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // تحديث كلمة المرور في قاعدة البيانات
      await this.prisma.traineeAuth.update({
        where: { id: accountId },
        data: { password: hashedPassword }
      });

      // بناء رسالة البيانات
      const message = await this.buildPlatformCredentialsMessage(account, newPassword);

      // إرسال الرسالة
      const success = await this.whatsappService.sendMessage(
        account.trainee.phone,
        message,
        userId
      );

      if (!success) {
        throw new BadRequestException('فشل إرسال الرسالة. يرجى التأكد من رقم الهاتف');
      }

      return {
        success: true,
        message: `تم إرسال بيانات المنصة بنجاح إلى ${account.trainee.nameAr}`
      };
    } catch (error) {
      console.error('خطأ في إرسال بيانات المنصة:', error);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('حدث خطأ أثناء إرسال الرسالة');
    }
  }

  /**
   * بناء رسالة بيانات تسجيل الدخول للمنصة
   */
  private async buildPlatformCredentialsMessage(account: any, password: string): Promise<string> {
    const trainee = account.trainee;
    const settings = await this.settingsService.getSettings();
    
    // الرسالة المختصرة
    let message = `🎓 *${trainee.nameAr}*\n\n`;
    message += `بيانات تسجيل الدخول للمنصة:\n\n`;
    message += `👤 اسم المستخدم: *${trainee.nationalId}*\n`;
    message += `🔐 كلمة المرور: *${trainee.nationalId}*\n\n`;
    message += `💡 كلمة المرور هي نفس الرقم القومي\n`;
    message += `⚠️ يرجى حفظ البيانات في مكان آمن\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `${settings?.centerName || 'نظام إدارة التدريب'}`;

    return message;
  }

  /**
   * ==========================================
   * التوزيعات الاختيارية
   * ==========================================
   */

  /**
   * جلب التوزيعات المتاحة للتسجيل الذاتي
   */
  async getAvailableDistributions(traineeId: number) {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId }
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    const now = new Date();

    // جلب التوزيعات المتاحة لهذا البرنامج ولنظام اختيار المتدربين
    const distributions = await this.prisma.traineeDistribution.findMany({
      where: {
        programId: trainee.programId,
        assignmentMode: 'TRAINEE_CHOICE',
        isVisibleToTrainees: true,
      },
      include: {
        classroom: true,
        rooms: {
          include: {
            _count: {
              select: { assignments: true }
            }
          }
        }
      }
    });

    // تحقق من المجموعات التي انضم إليها المتدرب
    const joinedAssignments = await this.prisma.distributionAssignment.findMany({
      where: {
        traineeId,
        room: {
          distribution: {
            assignmentMode: 'TRAINEE_CHOICE'
          }
        }
      },
      include: {
        room: true
      }
    });

    const joinedDistributionIds = joinedAssignments.map(a => a.room.distributionId);

    // تجهيز البيانات للعرض
    return distributions.map(dist => {
      // تحقق من التواريخ
      const isRegistrationOpen = 
        (!dist.registrationStartDate || now >= dist.registrationStartDate) &&
        (!dist.registrationEndDate || now <= dist.registrationEndDate);

      const isJoined = joinedDistributionIds.includes(dist.id);
      const joinedRoomId = isJoined 
        ? joinedAssignments.find(a => a.room.distributionId === dist.id)?.roomId 
        : null;

      return {
        id: dist.id,
        type: dist.type,
        academicYear: dist.academicYear,
        classroomName: dist.classroom?.name || 'عام للبرنامج',
        isRegistrationOpen,
        registrationStartDate: dist.registrationStartDate,
        registrationEndDate: dist.registrationEndDate,
        isJoined,
        joinedRoomId,
        rooms: dist.rooms.map(room => ({
          id: room.id,
          name: room.roomName,
          capacity: room.capacity,
          enrolledCount: room._count.assignments,
          isFull: room.capacity ? room._count.assignments >= room.capacity : false
        }))
      };
    });
  }

  /**
   * الانضمام إلى مجموعة (قاعة)
   */
  async joinDistributionRoom(traineeId: number, roomId: string) {
    const room = await this.prisma.distributionRoom.findUnique({
      where: { id: roomId },
      include: {
        distribution: true,
        _count: {
          select: { assignments: true }
        }
      }
    });

    if (!room) {
      throw new NotFoundException('القاعة غير موجودة');
    }

    const dist = room.distribution;

    if (dist.assignmentMode !== 'TRAINEE_CHOICE') {
      throw new BadRequestException('هذا التوزيع لا يسمح بالتسجيل الذاتي');
    }

    if (!dist.isVisibleToTrainees) {
      throw new BadRequestException('هذا التوزيع غير متاح حالياً');
    }

    const now = new Date();
    if (dist.registrationStartDate && now < dist.registrationStartDate) {
      throw new BadRequestException('لم يبدأ التسجيل في هذا التوزيع بعد');
    }
    if (dist.registrationEndDate && now > dist.registrationEndDate) {
      throw new BadRequestException('انتهت فترة التسجيل في هذا التوزيع');
    }

    if (room.capacity && room._count.assignments >= room.capacity) {
      throw new BadRequestException('هذه المجموعة ممتلئة');
    }

    // التأكد من عدم التسجيل في نفس القاعة مسبقاً
    const existingAssignment = await this.prisma.distributionAssignment.findFirst({
      where: {
        traineeId,
        room: {
          distributionId: dist.id
        }
      },
      include: {
        room: true
      }
    });

    if (existingAssignment && existingAssignment.roomId === room.id) {
      throw new BadRequestException('أنت مسجل بالفعل في هذه المجموعة');
    }

    if (room.capacity && room._count.assignments >= room.capacity) {
      throw new BadRequestException('هذه المجموعة ممتلئة');
    }

    // إذا كان مسجلاً في مجموعة أخرى بنفس التوزيع، نقوم بإزالته منها أولاً (طالما فترة التسجيل مفتوحة)
    if (existingAssignment) {
      await this.prisma.distributionAssignment.delete({
        where: { id: existingAssignment.id }
      });
    }

    // التسجيل في المجموعة الجديدة
    const assignment = await this.prisma.distributionAssignment.create({
      data: {
        roomId: room.id,
        traineeId,
        orderNumber: room._count.assignments + 1, // ترتيبه في القاعة
        notes: existingAssignment ? 'تغيير مجموعة (تسجيل ذاتي)' : 'تسجيل ذاتي'
      }
    });

    return { success: true, message: 'تم الانضمام للمجموعة بنجاح', assignment };
  }
}
