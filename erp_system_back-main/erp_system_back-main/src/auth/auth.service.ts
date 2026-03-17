import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';
import { SettingsService } from '../settings/settings.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private whatsappService: UnifiedWhatsAppService,
    private settingsService: SettingsService,
  ) {}

  async validateUser(emailOrPhone: string, password: string): Promise<any> {
    // محاولة العثور على المستخدم بالبريد الإلكتروني أو رقم الهاتف
    let user = null;
    
    // التحقق إذا كان المدخل يبدو كرقم هاتف (يحتوي على أرقام فقط أو بادئة +)
    const isPhoneNumber = /^[\+]?[0-9\s\-\(\)]*$/.test(emailOrPhone.trim());
    
    if (isPhoneNumber) {
      // البحث برقم الهاتف مع تحميل الأدوار
      user = await this.prisma.user.findUnique({
        where: { phone: emailOrPhone.trim() },
        include: {
          userRoles: {
            where: { isActive: true },
            include: {
              role: true
            }
          }
        }
      });
    } else {
      // البحث بالبريد الإلكتروني مع تحميل الأدوار
      user = await this.prisma.user.findUnique({
        where: { email: emailOrPhone.trim() },
        include: {
          userRoles: {
            where: { isActive: true },
            include: {
              role: true
            }
          }
        }
      });
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      // التحقق من حالة الأرشفة
      if (user.isArchived) {
        throw new ForbiddenException({ message: 'تم إيقاف حسابك ولا يمكنك الوصول للمنصة الإدارية. تواصل مع الإدارة لمزيد من المعلومات.', isArchived: true, statusCode: 403 });
      }
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    // استخراج الأدوار من بيانات المستخدم
    const roles = user.userRoles?.map((userRole) => ({
      id: userRole.role.id,
      name: userRole.role.name,
      displayName: userRole.role.displayName,
      color: userRole.role.color,
      icon: userRole.role.icon,
      priority: userRole.role.priority,
    })) || [];

    // ترتيب الأدوار حسب الأولوية (الأعلى أولاً)
    roles.sort((a, b) => b.priority - a.priority);

    // إضافة الدور الرئيسي (أعلى أولوية) إلى payload للـ JWT
    const primaryRole = roles[0] || null;
    
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      role: primaryRole?.name || null,
      accountType: user.accountType,
      isArchived: user.isArchived || false,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        isArchived: user.isArchived || false,
        photoUrl: user.photoUrl || null,
        roles: roles,
        primaryRole: primaryRole,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // التحقق من حالة الأرشفة
    if (user.isArchived) {
      throw new ForbiddenException({ message: 'تم إيقاف حسابك ولا يمكنك الوصول للمنصة الإدارية. تواصل مع الإدارة لمزيد من المعلومات.', isArchived: true, statusCode: 403 });
    }

    // استخراج الأدوار من بيانات المستخدم
    const roles = user.userRoles?.map((userRole) => ({
      id: userRole.role.id,
      name: userRole.role.name,
      displayName: userRole.role.displayName,
      color: userRole.role.color,
      icon: userRole.role.icon,
      priority: userRole.role.priority,
    })) || [];

    // ترتيب الأدوار حسب الأولوية (الأعلى أولاً)
    roles.sort((a, b) => b.priority - a.priority);
    const primaryRole = roles[0] || null;

    const { password, userRoles, ...result } = user;
    return {
      ...result,
      isArchived: user.isArchived || false,
      roles: roles,
      primaryRole: primaryRole,
      accountType: user.accountType,
    };
  }

  // توليد كود إعادة تعيين كلمة المرور رقم عشوائي من 6 أرقام
  private generateResetCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // تنسيق رقم الهاتف
  private formatPhoneNumber(phoneNumber: string): string {
    // إزالة جميع الأحرف غير الرقمية
    let cleaned = phoneNumber.replace(/\D/g, '');

    // التعامل مع الأرقام المصرية
    if (cleaned.startsWith('010') || cleaned.startsWith('011') || cleaned.startsWith('012') || cleaned.startsWith('015')) {
      cleaned = '2' + cleaned;
    } else if (cleaned.startsWith('10') || cleaned.startsWith('11') || cleaned.startsWith('12') || cleaned.startsWith('15')) {
      cleaned = '20' + cleaned;
    } else if (!cleaned.startsWith('2')) {
      cleaned = '2' + cleaned;
    }

    return cleaned;
  }

  async requestPasswordReset(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      // البحث عن المستخدم برقم الهاتف
      const user = await this.prisma.user.findUnique({
        where: { phone: phoneNumber },
      });

      if (!user) {
        throw new NotFoundException('لا يوجد حساب مرتبط بهذا الرقم');
      }

      if (user.isArchived) {
        throw new ForbiddenException({ message: 'تم إيقاف حسابك ولا يمكنك استعادة كلمة المرور. تواصل مع الإدارة لمزيد من المعلومات.', isArchived: true, statusCode: 403 });
      }

      if (!user.isActive) {
        throw new BadRequestException('الحساب غير نشط');
      }

      // التحقق من وجود طلب حديث لإعادة تعيين كلمة المرور (منع الإرسال المتكرر)
      if (user.resetCodeGeneratedAt) {
        const timeDiff = Date.now() - user.resetCodeGeneratedAt.getTime();
        const waitTime = 2 * 60 * 1000; // دقيقتان بالميلي ثانية
        
        if (timeDiff < waitTime) {
          const remainingTime = Math.ceil((waitTime - timeDiff) / 1000 / 60);
          throw new BadRequestException(`يرجى الانتظار ${remainingTime} دقيقة قبل طلب كود جديد`);
        }
      }

      // توليد كود إعادة التعيين
      const resetCode = this.generateResetCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // ينتهي خلال 15 دقيقة

      // حفظ الكود في قاعدة البيانات
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetCode,
          resetCodeExpiresAt: expiresAt,
          resetCodeGeneratedAt: new Date(),
        },
      });

      // إرسال الكود عبر WhatsApp
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const settings = await this.settingsService.getSettings();
      const message = this.buildResetCodeMessage(user.name, resetCode, settings);
      
      const messageSent = await this.whatsappService.sendMessage(formattedPhone, message, user.id);

      if (!messageSent) {
        // حذف الكود في حالة فشل الإرسال
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            resetCode: null,
            resetCodeExpiresAt: null,
            resetCodeGeneratedAt: null,
          },
        });
        throw new BadRequestException('فشل في إرسال كود التحقق، يرجى المحاولة لاحقاً');
      }

      return {
        success: true,
        message: 'تم إرسال كود إعادة تعيين كلمة المرور إلى WhatsApp'
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('حدث خطأ أثناء طلب إعادة تعيين كلمة المرور');
    }
  }

  async verifyResetCode(phoneNumber: string, resetCode: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { phone: phoneNumber },
      });

      if (!user) {
        throw new NotFoundException('لا يوجد حساب مرتبط بهذا الرقم');
      }

      if (user.isArchived) {
        throw new ForbiddenException({ message: 'تم إيقاف حسابك ولا يمكنك استعادة كلمة المرور. تواصل مع الإدارة لمزيد من المعلومات.', isArchived: true, statusCode: 403 });
      }

      if (!user.resetCode || !user.resetCodeExpiresAt) {
        throw new BadRequestException('لا يوجد طلب إعادة تعيين كلمة مرور نشط');
      }

      if (user.resetCode !== resetCode) {
        throw new BadRequestException('كود التحقق غير صحيح');
      }

      if (user.resetCodeExpiresAt < new Date()) {
        // حذف الكود المنتهي الصلاحية
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            resetCode: null,
            resetCodeExpiresAt: null,
            resetCodeGeneratedAt: null,
          },
        });
        throw new BadRequestException('انتهت صلاحية كود التحقق، يرجى طلب كود جديد');
      }

      return {
        success: true,
        message: 'كود التحقق صحيح'
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('حدث خطأ أثناء التحقق من الكود');
    }
  }

  async resetPassword(phoneNumber: string, resetCode: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // التحقق من الكود أولاً
      await this.verifyResetCode(phoneNumber, resetCode);

      const user = await this.prisma.user.findUnique({
        where: { phone: phoneNumber },
      });

      if (!user) {
        throw new NotFoundException('لا يوجد حساب مرتبط بهذا الرقم');
      }

      // تشفير كلمة المرور الجديدة
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // تحديث كلمة المرور وحذف بيانات إعادة التعيين
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetCode: null,
          resetCodeExpiresAt: null,
          resetCodeGeneratedAt: null,
        },
      });

      return {
        success: true,
        message: 'تم تغيير كلمة المرور بنجاح'
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('حدث خطأ أثناء إعادة تعيين كلمة المرور');
    }
  }

  private buildResetCodeMessage(userName: string, resetCode: string, settings: any): string {
    const now = new Date();
    const arabicTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const centerName = settings?.centerName || 'مركز طيبة للتدريب المهني';

    return `🔐 كود إعادة تعيين كلمة المرور

مرحباً ${userName} 👋

تم طلب إعادة تعيين كلمة المرور لحسابك

🔢 كود التحقق: ${resetCode}

⏰ صالح لمدة 15 دقيقة فقط
🕐 وقت الإرسال: ${arabicTime}

⚠️ لا تشارك هذا الكود مع أي شخص

🏫 ${centerName}`;
  }
}