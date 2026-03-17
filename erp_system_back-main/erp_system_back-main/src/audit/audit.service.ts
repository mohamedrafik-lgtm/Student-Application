import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '../types';
import { Prisma } from '../types';

export interface CreateAuditLogInput {
  action: AuditAction | string;
  entity: string;
  entityId: string;
  details?: Prisma.JsonValue;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: CreateAuditLogInput) {
    try {
      // Convert the action to the format expected by Prisma
      // This is a workaround until we can properly regenerate the Prisma client
      return await this.prisma.auditLog.create({
        data: {
          // Pass the action as any to bypass type checking temporarily
          action: data.action as any,
          entity: data.entity,
          entityId: data.entityId,
          details: data.details || {},
          user: {
            connect: {
              id: data.userId,
            },
          },
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw the error to prevent disrupting application flow
      // Just log it and return null
      return null;
    }
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.AuditLogWhereUniqueInput;
    where?: Prisma.AuditLogWhereInput;
    orderBy?: Prisma.AuditLogOrderByWithRelationInput;
  }) {
    const { skip, take, cursor, where, orderBy } = options || {};

    const auditLogs = await this.prisma.auditLog.findMany({
        skip,
        take,
        cursor,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

    const count = await this.prisma.auditLog.count({
      where,
    });

    return {
      data: auditLogs,
      count,
    };
  }

  async findRecent(limit: number = 5) {
    const auditLogs = await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // تحويل البيانات إلى تنسيق مناسب للداشبورد
    return auditLogs.map(log => ({
      time: this.getRelativeTime(log.createdAt),
      title: this.getActivityTitle(log.action as string, log.entity),
      description: this.getActivityDescription(log),
      color: this.getActivityColor(log.action as string),
      status: 'success',
    }));
  }

  private getActivityTitle(action: string, entity: string): string {
    const actionNames = {
      CREATE: 'إنشاء',
      UPDATE: 'تحديث',
      DELETE: 'حذف',
      LOGIN_SUCCESS: 'تسجيل دخول',
      LOGIN_FAILURE: 'فشل تسجيل دخول',
    };

    const entityNames = {
      Trainee: 'متدرب',
      TrainingProgram: 'برنامج تدريبي',
      User: 'مستخدم',
      News: 'خبر',
      Job: 'وظيفة',
      TrainingContent: 'محتوى تدريبي',
      Session: 'جلسة',
      AttendanceRecord: 'سجل حضور',
    };

    return `${actionNames[action] || action} ${entityNames[entity] || entity}`;
  }

  private getActivityDescription(activity: any): string {
    if (activity.details && typeof activity.details === 'object' && activity.details.message) {
      return activity.details.message;
    }
    return `تم ${this.getActivityTitle(activity.action, activity.entity)} بواسطة ${activity.user?.name || 'مستخدم'}`;
  }

  private getActivityColor(action: string): string {
    const colorMap = {
      CREATE: 'success',
      UPDATE: 'primary',
      DELETE: 'error',
      LOGIN_SUCCESS: 'success',
      LOGIN_FAILURE: 'error',
    };
    return colorMap[action] || 'primary';
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return 'الآن';
    } else if (diffInMinutes < 60) {
      return `منذ ${diffInMinutes} دقيقة`;
    } else if (diffInHours < 24) {
      return `منذ ${diffInHours} ساعة`;
    } else {
      return `منذ ${diffInDays} يوم`;
    }
  }
} 