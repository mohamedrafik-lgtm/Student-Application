import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserProgramAccessService {
  constructor(private prisma: PrismaService) {}

  /**
   * الحصول على IDs البرامج المسموح للمستخدم بالوصول إليها
   * إذا كانت القائمة فارغة = مسموح بكل البرامج
   */
  async getAllowedProgramIds(userId: string): Promise<number[]> {
    const records = await this.prisma.userProgramAccess.findMany({
      where: { userId },
      select: { programId: true },
    });
    return records.map((r) => r.programId);
  }

  /**
   * تعيين البرامج المسموح للمستخدم بالوصول إليها
   * إذا كانت programIds فارغة = إزالة كل التقييدات (مسموح بكل البرامج)
   */
  async setAllowedPrograms(userId: string, programIds: number[]): Promise<void> {
    // حذف كل السجلات القديمة
    await this.prisma.userProgramAccess.deleteMany({
      where: { userId },
    });

    // إضافة السجلات الجديدة (إذا وجدت)
    if (programIds.length > 0) {
      await this.prisma.userProgramAccess.createMany({
        data: programIds.map((programId) => ({
          userId,
          programId,
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * الحصول على البرامج المسموح للمستخدم مع تفاصيلها
   */
  async getAllowedProgramsWithDetails(userId: string) {
    const records = await this.prisma.userProgramAccess.findMany({
      where: { userId },
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
    return records.map((r) => r.program);
  }

  /**
   * التحقق من أن programId المطلوب ضمن البرامج المسموح بها للمستخدم
   * إذا لم يكن هناك تقييدات (قائمة فارغة) = مسموح
   * إذا كان هناك تقييدات و programId ليس ضمنها = ممنوع
   */
  async validateProgramAccess(userId: string, programId: number): Promise<boolean> {
    const allowedIds = await this.getAllowedProgramIds(userId);
    
    // إذا لم يكن هناك تقييدات = مسموح بكل شيء
    if (allowedIds.length === 0) return true;
    
    return allowedIds.includes(programId);
  }

  /**
   * تطبيق فلتر البرامج المسموحة على where clause
   * يُستخدم في كل الخدمات التي تجلب بيانات مرتبطة ببرنامج
   * 
   * @returns programId filter to add to where clause, or undefined if no restriction
   */
  async applyProgramFilter(userId: string, requestedProgramId?: number): Promise<{ programId?: number | { in: number[] } }> {
    const allowedIds = await this.getAllowedProgramIds(userId);
    
    // إذا لم يكن هناك تقييدات
    if (allowedIds.length === 0) {
      // استخدم الفلتر المطلوب كما هو (أو لا فلتر)
      if (requestedProgramId) {
        return { programId: requestedProgramId };
      }
      return {};
    }

    // إذا حدد programId معين في الطلب
    if (requestedProgramId) {
      // تحقق أنه ضمن المسموح
      if (!allowedIds.includes(requestedProgramId)) {
        throw new ForbiddenException('ليس لديك صلاحية الوصول لهذا البرنامج التدريبي');
      }
      return { programId: requestedProgramId };
    }

    // لم يحدد programId → فلتر بكل البرامج المسموحة
    return { programId: { in: allowedIds } };
  }

  /**
   * هل المستخدم مقيد ببرامج معينة؟
   */
  async isRestricted(userId: string): Promise<boolean> {
    const count = await this.prisma.userProgramAccess.count({
      where: { userId },
    });
    return count > 0;
  }
}
