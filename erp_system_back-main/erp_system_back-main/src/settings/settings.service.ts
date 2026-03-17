import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.systemSettings.findFirst();
    
    if (!settings) {
      // إنشاء إعدادات افتراضية
      settings = await this.prisma.systemSettings.create({
        data: {
          centerName: 'مركز طيبة للتدريب المهني',
          centerManagerName: 'مدير المركز',
          centerAddress: 'المنصورة - مصر',
          centerLogo: null,
          facebookPageUrl: null,
          licenseNumber: '29',
          loginUrl: null,
          managerPhoneNumber: null,
          showTraineeDebtsToTraineeAffairs: false,
          printingAmount: 0,
          timezone: 'Africa/Cairo',
        },
      });
    }
    
    return settings;
  }

  async updateSettings(data: Prisma.SystemSettingsUpdateInput) {
    const settings = await this.prisma.systemSettings.findFirst();
    if (!settings) throw new NotFoundException('لم يتم العثور على إعدادات النظام');
    return this.prisma.systemSettings.update({
      where: { id: settings.id },
      data,
    });
  }
} 