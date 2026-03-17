import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { toJsonValue } from '../lib/utils';
import { UnifiedWhatsAppService } from '../whatsapp/unified-whatsapp.service';
import { SettingsService } from '../settings/settings.service';
import { PermissionsService } from '../permissions/permissions.service';
import { UserProgramAccessService } from './user-program-access.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private whatsappService: UnifiedWhatsAppService,
    private settingsService: SettingsService,
    private permissionsService: PermissionsService,
    private userProgramAccessService: UserProgramAccessService,
  ) {
    console.log('=== USERS SERVICE CONSTRUCTOR ===');
    console.log('WhatsApp Service injected:', !!this.whatsappService);
    console.log('WhatsApp Service type:', typeof this.whatsappService);
    console.log('Settings Service injected:', !!this.settingsService);
    console.log('===================================');
  }

  async create(createUserDto: CreateUserDto, creatorId: string) {
    console.log('=== USER SERVICE CREATE ===');
    console.log('CreatorId:', creatorId);
    console.log('CreateUserDto:', createUserDto);
    console.log('===========================');

    const { roleId, allowedProgramIds, ...userData } = createUserDto;

    // التحقق من صلاحية تعيين الدور (إذا تم تحديد دور)
    if (roleId) {
      await this.validateRoleAssignment(roleId, creatorId);
    }

    // Check if user with the same email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if user with the same phone already exists (if phone is provided)
    if (userData.phone) {
      const existingUserByPhone = await this.prisma.user.findUnique({
        where: { phone: userData.phone },
      });

      if (existingUserByPhone) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        accountType: userData.accountType || 'STAFF', // افتراضياً STAFF
      },
    });
    
    console.log('=== USER CREATED SUCCESSFULLY ===');
    console.log('User ID:', user.id);
    console.log('User Name:', user.name);
    console.log('User Phone:', user.phone);
    console.log('==================================');

    await this.auditService.log({
      action: AuditAction.CREATE,
      entity: 'User',
      entityId: user.id,
      userId: creatorId,
      details: { message: `Created user ${user.name} (${user.email})` },
    });

    // تعيين الدور للمستخدم الجديد (إذا تم تحديد دور)
    if (roleId) {
      try {
        await this.permissionsService.assignRoleToUser({
          userId: user.id,
          roleId: roleId,
          assignedBy: creatorId,
        });
        console.log(`Role ${roleId} assigned to user ${user.id} successfully`);
      } catch (error) {
        console.error('Failed to assign role to user:', error);
        // لا نفشل إنشاء المستخدم إذا فشل تعيين الدور
      }
    }

    // Send WhatsApp message with login credentials
    try {
      console.log(`Attempting to send WhatsApp welcome message to user: ${user.name} (${user.phone})`);
      console.log('WhatsApp Service available:', !!this.whatsappService);
      console.log('WhatsApp Service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.whatsappService)));
      
      await this.sendUserWelcomeMessage(user, createUserDto.password, creatorId);
      console.log(`WhatsApp welcome message sent successfully to: ${user.phone}`);
    } catch (error) {
      console.error('Failed to send WhatsApp welcome message:', error);
      console.error('Error stack:', error.stack);
      // Don't fail user creation if WhatsApp message fails
    }

    // تعيين البرامج التدريبية المسموح بها (إذا تم تحديدها)
    if (allowedProgramIds && allowedProgramIds.length > 0) {
      try {
        await this.userProgramAccessService.setAllowedPrograms(user.id, allowedProgramIds);
        console.log(`Allowed programs set for user ${user.id}:`, allowedProgramIds);
      } catch (error) {
        console.error('Failed to set allowed programs:', error);
      }
    }

    // Remove password from response
    const { password, ...result } = user;
    return result;
  }

  private async sendUserWelcomeMessage(user: any, plainPassword: string, creatorId: string): Promise<void> {
    if (!user.phone) {
      console.log('No phone number provided for user, skipping WhatsApp message');
      return; // Skip if no phone number
    }

    console.log(`Building welcome message for user: ${user.name}`);
    const message = await this.buildUserWelcomeMessage(user, plainPassword);
    console.log(`Welcome message built, length: ${message.length} characters`);
    
    try {
      console.log(`Calling WhatsApp service to send message to: ${user.phone}`);
      const success = await this.whatsappService.sendMessage(user.phone, message, creatorId);
      console.log(`WhatsApp service response: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      if (success) {
        await this.auditService.log({
          action: AuditAction.CREATE,
          entity: 'WhatsApp',
          entityId: user.id,
          userId: creatorId,
          details: { 
            message: `Welcome message sent to user ${user.name}`,
            phoneNumber: user.phone
          },
        });
        console.log('Audit log created for successful WhatsApp message');
      } else {
        console.error('Failed to send WhatsApp message - service returned false');
      }
    } catch (error) {
      console.error('Exception occurred while sending WhatsApp message:', error);
      throw error;
    }
  }

  private async buildUserWelcomeMessage(user: any, plainPassword: string): Promise<string> {
    try {
      const settings = await this.settingsService.getSettings();
      const loginUrl = settings.loginUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
      
      return `🎉 مرحباً بك في نظام إدارة ${settings.centerName}!

👤 مرحباً ${user.name}

تم إنشاء حسابك بنجاح في نظام إدارة المركز. يمكنك الآن تسجيل الدخول باستخدام البيانات التالية:

📧 البريد الإلكتروني: ${user.email}
🔐 كلمة المرور: ${plainPassword}

💡 لأمانك، ننصحك بتغيير كلمة المرور بعد تسجيل الدخول الأول.

🌐 رابط تسجيل الدخول: ${loginUrl}

للمساعدة أو الاستفسار، لا تتردد في التواصل معنا.

مع تحياتنا ❤️
${settings.centerName}`;
    } catch (error) {
      console.error('Error fetching settings for welcome message:', error);
      return `🎉 مرحباً بك في نظام إدارة المركز!

👤 مرحباً ${user.name}

تم إنشاء حسابك بنجاح في نظام إدارة المركز. يمكنك الآن تسجيل الدخول باستخدام البيانات التالية:

📧 البريد الإلكتروني: ${user.email}
🔐 كلمة المرور: ${plainPassword}

💡 لأمانك، ننصحك بتغيير كلمة المرور بعد تسجيل الدخول الأول.

🌐 رابط تسجيل الدخول: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

للمساعدة أو الاستفسار، لا تتردد في التواصل معنا.

مع تحياتنا ❤️`;
    }
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: { granted: true },
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        userPermissions: {
          include: {
            permission: true,
          },
        },
        allowedPrograms: {
          include: {
            program: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
              },
            },
          },
        },
      },
    });
    return users.map(({ password, ...rest }) => ({
      ...rest,
      allowedProgramIds: rest.allowedPrograms?.map(ap => ap.program.id) || [],
      allowedProgramsList: rest.allowedPrograms?.map(ap => ap.program) || [],
    }));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        allowedPrograms: {
          include: {
            program: {
              select: {
                id: true,
                nameAr: true,
                nameEn: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, ...result } = user;
    return {
      ...result,
      allowedProgramIds: result.allowedPrograms?.map(ap => ap.program.id) || [],
      allowedProgramsList: result.allowedPrograms?.map(ap => ap.program) || [],
    };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, actorId: string) {
    const before = await this.prisma.user.findUnique({ where: { id } });

    if (!before) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // استخراج allowedProgramIds من الـ DTO قبل التحديث
    const { allowedProgramIds, ...updateData } = updateUserDto as any;

    // Check if email is being updated and if it's already taken by another user
    if (updateData.email && updateData.email !== before.email) {
      const existingUserByEmail = await this.prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (existingUserByEmail) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Check if phone is being updated and if it's already taken by another user
    if (updateData.phone && updateData.phone !== before.phone) {
      const existingUserByPhone = await this.prisma.user.findUnique({
        where: { phone: updateData.phone },
      });

      if (existingUserByPhone) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    // If password is provided, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const after = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // تحديث البرامج المسموح بها (إذا تم تمريرها)
    if (allowedProgramIds !== undefined) {
      await this.userProgramAccessService.setAllowedPrograms(id, allowedProgramIds || []);
      console.log(`Updated allowed programs for user ${id}:`, allowedProgramIds);
    }

    await this.auditService.log({
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: id,
      userId: actorId,
      details: toJsonValue({ before, after, allowedProgramIds }),
    });

    // Remove password from response
    const { password, ...result } = after;
    return result;
  }

  async remove(id: string, actorId: string) {
    const userToDelete = await this.prisma.user.findUnique({ where: { id } });

    if (!userToDelete) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'User',
      entityId: id,
      userId: actorId,
      details: toJsonValue({ message: `Deleted user ${userToDelete.name}`, deletedData: userToDelete }),
    });

    // Delete user with cascade delete for related documents
    await this.prisma.user.delete({
      where: { id },
    }).catch(async (error) => {
      if (error.code === 'P2003' && error.meta?.modelName === 'User') {
        // Handle foreign key constraint violation
        // First, update all documents uploaded by this user to null
        await this.prisma.traineeDocument.updateMany({
          where: { uploadedById: id },
          data: { uploadedById: null }
        });

        // Then try to delete the user again
        await this.prisma.user.delete({
          where: { id },
        });
      } else {
        throw error;
      }
    });

    // Log successful deletion
    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'User',
      entityId: id,
      userId: actorId,
      details: {
        message: `Deleted user with ID ${id}`,
        deletedData: { id }
      }
    });

    return { id, message: 'User deleted successfully with all related documents updated' };
  }

  async changePassword(
    id: string, 
    changePasswordDto: { currentPassword: string; newPassword: string }, 
    actorId: string
  ) {
    // التحقق من أن المستخدم يغير كلمة مروره الخاصة فقط
    if (id !== actorId) {
      throw new BadRequestException('لا يمكنك تغيير كلمة مرور مستخدم آخر');
    }

    // العثور على المستخدم
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    // التحقق من كلمة المرور الحالية
    const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
    }

    // تشفير كلمة المرور الجديدة
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // تحديث كلمة المرور
    await this.prisma.user.update({
      where: { id },
      data: { 
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });

    // تسجيل العملية في سجل التدقيق
    await this.auditService.log({
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: id,
      userId: actorId,
      details: toJsonValue({ message: `Password changed for user ${user.name}` }),
    });

    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }

  // دالة للتحقق من صلاحية تعيين الدور
  private async validateRoleAssignment(roleId: string, creatorId: string) {
    // الحصول على الدور المراد تعيينه
    const targetRole = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!targetRole) {
      throw new NotFoundException('الدور المحدد غير موجود');
    }

    if (!targetRole.isActive) {
      throw new ForbiddenException('لا يمكن تعيين دور غير مفعل');
    }

    // الحصول على صلاحيات المستخدم الحالي
    const creatorPermissions = await this.permissionsService.getUserPermissions(creatorId);

    // السوبر أدمن يمكنه تعيين أي دور عدا السوبر أدمن نفسه
    if (creatorPermissions.hasRole('super_admin')) {
      if (targetRole.name === 'super_admin') {
        throw new ForbiddenException('لا يمكن إنشاء مستخدم بدور السوبر أدمن');
      }
      return; // مسموح
    }

    // الأدمن يمكنه تعيين الأدوار الأقل منه
    if (creatorPermissions.hasRole('admin')) {
      if (targetRole.name === 'super_admin' || targetRole.name === 'admin') {
        throw new ForbiddenException('لا يمكنك تعيين دور مساوي أو أعلى من دورك');
      }
      if (targetRole.priority >= 900) { // أولوية الأدمن هي 900
        throw new ForbiddenException('لا يمكنك تعيين دور بأولوية مساوية أو أعلى من دورك');
      }
      return; // مسموح
    }

    // المدير يمكنه تعيين الأدوار الأقل منه
    if (creatorPermissions.hasRole('manager')) {
      if (['super_admin', 'admin', 'manager'].includes(targetRole.name)) {
        throw new ForbiddenException('لا يمكنك تعيين دور مساوي أو أعلى من دورك');
      }
      if (targetRole.priority >= 800) { // أولوية المدير هي 800
        throw new ForbiddenException('لا يمكنك تعيين دور بأولوية مساوية أو أعلى من دورك');
      }
      return; // مسموح
    }

    // إذا كان لديه صلاحية إدارة المستخدمين، يمكنه تعيين الأدوار الأساسية فقط
    if (creatorPermissions.hasPermission('dashboard.users', 'manage')) {
      const allowedRoles = ['viewer', 'trainee_entry_clerk', 'marketing_employee'];
      if (!allowedRoles.includes(targetRole.name)) {
        throw new ForbiddenException('يمكنك تعيين الأدوار الأساسية فقط (عارض، موظف إدخال متدربين، موظف تسويق)');
      }
      return; // مسموح
    }

    // بشكل افتراضي، لا يمكن تعيين أي أدوار
    throw new ForbiddenException('ليس لديك صلاحية لتعيين أدوار للمستخدمين');
  }

  // تحديث الصورة الشخصية للمستخدم
  async updateProfilePhoto(userId: string, photoUrl: string): Promise<{ photoUrl: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { photoUrl },
    });

    return { photoUrl };
  }

  // حذف الصورة الشخصية للمستخدم
  async removeProfilePhoto(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { photoUrl: null },
    });

    return { message: 'تم حذف الصورة الشخصية بنجاح' };
  }
}