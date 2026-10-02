import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserDistributionAccessService {
  constructor(private prisma: PrismaService) {}

  // ==================== التوزيعات ====================

  async getAllowedDistributionIds(userId: string): Promise<string[]> {
    const records = await this.prisma.userDistributionAccess.findMany({
      where: { userId },
      select: { distributionId: true },
    });
    return records.map((r) => r.distributionId);
  }

  async setAllowedDistributions(userId: string, distributionIds: string[]): Promise<void> {
    await this.prisma.userDistributionAccess.deleteMany({
      where: { userId },
    });

    if (distributionIds.length > 0) {
      await this.prisma.userDistributionAccess.createMany({
        data: distributionIds.map((distributionId) => ({
          userId,
          distributionId,
        })),
        skipDuplicates: true,
      });
    }

    // حذف سجلات الغرف للتوزيعات التي لم تعد مسموحة
    if (distributionIds.length > 0) {
      const existingRoomAccess = await this.prisma.userDistributionRoomAccess.findMany({
        where: { userId },
        include: { room: { select: { distributionId: true } } },
      });
      const roomIdsToRemove = existingRoomAccess
        .filter((ra) => !distributionIds.includes(ra.room.distributionId))
        .map((ra) => ra.id);
      if (roomIdsToRemove.length > 0) {
        await this.prisma.userDistributionRoomAccess.deleteMany({
          where: { id: { in: roomIdsToRemove } },
        });
      }
    } else {
      // إذا لم يعد مقيد بتوزيعات → حذف كل سجلات الغرف أيضاً
      await this.prisma.userDistributionRoomAccess.deleteMany({
        where: { userId },
      });
    }
  }

  async getAllowedDistributionsWithDetails(userId: string) {
    const records = await this.prisma.userDistributionAccess.findMany({
      where: { userId },
      include: {
        distribution: {
          select: {
            id: true,
            programId: true,
            type: true,
            classroomId: true,
            numberOfRooms: true,
            program: { select: { id: true, nameAr: true, nameEn: true } },
            classroom: { select: { id: true, name: true, classNumber: true } },
            rooms: {
              select: {
                id: true,
                roomName: true,
                roomNumber: true,
                _count: { select: { assignments: true } },
              },
              orderBy: { roomNumber: 'asc' },
            },
          },
        },
      },
    });
    return records.map((r) => r.distribution);
  }

  async isDistributionRestricted(userId: string): Promise<boolean> {
    const count = await this.prisma.userDistributionAccess.count({
      where: { userId },
    });
    return count > 0;
  }

  // ==================== المجموعات (الغرف) ====================

  async getAllowedRoomIds(userId: string): Promise<string[]> {
    const records = await this.prisma.userDistributionRoomAccess.findMany({
      where: { userId },
      select: { roomId: true },
    });
    return records.map((r) => r.roomId);
  }

  /**
   * الحصول على الغرف المسموحة لتوزيعة معينة
   * إذا لم يكن هناك سجلات = كل الغرف مسموحة
   */
  async getAllowedRoomIdsForDistribution(userId: string, distributionId: string): Promise<string[]> {
    const records = await this.prisma.userDistributionRoomAccess.findMany({
      where: {
        userId,
        room: { distributionId },
      },
      select: { roomId: true },
    });
    return records.map((r) => r.roomId);
  }

  async setAllowedRooms(userId: string, roomIds: string[]): Promise<void> {
    await this.prisma.userDistributionRoomAccess.deleteMany({
      where: { userId },
    });

    if (roomIds.length > 0) {
      await this.prisma.userDistributionRoomAccess.createMany({
        data: roomIds.map((roomId) => ({
          userId,
          roomId,
        })),
        skipDuplicates: true,
      });
    }
  }

  async getAllowedRoomsWithDetails(userId: string) {
    const records = await this.prisma.userDistributionRoomAccess.findMany({
      where: { userId },
      include: {
        room: {
          select: {
            id: true,
            roomName: true,
            roomNumber: true,
            distributionId: true,
            _count: { select: { assignments: true } },
          },
        },
      },
    });
    return records.map((r) => r.room);
  }

  /**
   * الحصول على كامل بيانات الصلاحيات (توزيعات + غرف) للمستخدم
   */
  async getFullAccessData(userId: string) {
    const [distributions, rooms] = await Promise.all([
      this.getAllowedDistributionsWithDetails(userId),
      this.getAllowedRoomsWithDetails(userId),
    ]);

    return {
      distributionIds: distributions.map((d) => d.id),
      distributions,
      roomIds: rooms.map((r) => r.id),
      rooms,
    };
  }

  /**
   * الحصول على خريطة الغرف المسموحة لكل توزيعة
   * يعيد Map<distributionId, Set<roomId>>
   * التوزيعة التي ليس لها سجلات = كل الغرف مسموحة
   */
  async getAllowedRoomsByDistribution(userId: string): Promise<Map<string, Set<string>>> {
    const records = await this.prisma.userDistributionRoomAccess.findMany({
      where: { userId },
      include: {
        room: { select: { distributionId: true } },
      },
    });
    const map = new Map<string, Set<string>>();
    for (const r of records) {
      const distId = r.room.distributionId;
      if (!map.has(distId)) map.set(distId, new Set());
      map.get(distId)!.add(r.roomId);
    }
    return map;
  }

  /**
   * تطبيق فلتر الغرف على قائمة توزيعات
   * يفلتر الغرف فقط للتوزيعات التي لها سجلات غرف محددة
   */
  async filterDistributionRooms(userId: string, distributions: any[]): Promise<any[]> {
    const roomMap = await this.getAllowedRoomsByDistribution(userId);
    if (roomMap.size === 0) return distributions; // لا توجد قيود على الغرف

    return distributions.map((d: any) => {
      const allowedRooms = roomMap.get(d.id);
      if (!allowedRooms) return d; // هذه التوزيعة ليس لها قيود غرف → كل الغرف مسموحة
      return {
        ...d,
        rooms: d.rooms?.filter((r: any) => allowedRooms.has(r.id)) || [],
      };
    });
  }

  /**
   * الحصول على معرّفات الغرف المسموحة للمستخدم (الكل)
   * يأخذ في الاعتبار: التوزيعات المحددة + الغرف المحددة لكل توزيعة
   * يعيد null إذا لم يكن هناك قيود (كل شيء مسموح)
   * يعيد مصفوفة من معرّفات الغرف إذا كان مقيّد
   */
  async getEffectiveAllowedRoomIds(userId: string): Promise<string[] | null> {
    // الخطوة 1: هل المستخدم مقيد بتوزيعات معينة؟
    const allowedDistIds = await this.getAllowedDistributionIds(userId);
    if (allowedDistIds.length === 0) return null; // لا قيود → كل شيء مسموح

    // الخطوة 2: جلب كل غرف التوزيعات المسموحة
    const distributions = await this.prisma.traineeDistribution.findMany({
      where: { id: { in: allowedDistIds } },
      select: {
        id: true,
        rooms: { select: { id: true } },
      },
    });

    // الخطوة 3: هل هناك قيود على مستوى الغرف؟
    const roomMap = await this.getAllowedRoomsByDistribution(userId);

    const effectiveRoomIds: string[] = [];
    for (const dist of distributions) {
      const specificRooms = roomMap.get(dist.id);
      if (specificRooms) {
        // هذه التوزيعة لها غرف محددة
        for (const rid of specificRooms) effectiveRoomIds.push(rid);
      } else {
        // كل غرف هذه التوزيعة مسموحة
        for (const room of dist.rooms) effectiveRoomIds.push(room.id);
      }
    }

    return effectiveRoomIds;
  }

  /**
   * الحصول على معرّفات المتدربين المسموح للمستخدم رؤيتهم
   * بناءً على التوزيعات والغرف المسموحة
   * يعيد null إذا لم يكن هناك قيود
   */
  async getRestrictedTraineeIds(userId: string): Promise<number[] | null> {
    const roomIds = await this.getEffectiveAllowedRoomIds(userId);
    if (roomIds === null) return null; // لا قيود

    if (roomIds.length === 0) return []; // مقيد لكن لا غرف → لا متدربين

    const assignments = await this.prisma.distributionAssignment.findMany({
      where: { roomId: { in: roomIds } },
      select: { traineeId: true },
      distinct: ['traineeId'],
    });

    return assignments.map((a) => a.traineeId);
  }
}
