import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordIdCardPrintDto } from './dto/record-print.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

@Injectable()
export class IdCardsService {
  constructor(private prisma: PrismaService) {}

  // الحصول على سجل طباعات الكارنيه لمتدرب معين
  async getTraineePrints(traineeId: number) {
    return this.prisma.idCardPrint.findMany({
      where: { traineeId },
      include: {
        printedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { printedAt: 'desc' },
    });
  }

  // تسجيل عملية طباعة جديدة
  async recordPrint(recordPrintDto: RecordIdCardPrintDto) {
    const { traineeId, printedById, notes, designId } = recordPrintDto;
    
    return this.prisma.idCardPrint.create({
      data: {
        traineeId,
        printedById,
        notes,
        designId,
      },
      include: {
        printedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // الحصول على إعدادات النظام لرسم الكارنيه
  async getSystemSettings() {
    const settings = await this.prisma.systemSettings.findFirst({
      select: {
        centerName: true,
        centerLogo: true,
        idCardBackgroundImage: true,
        idCardWidth: true,
        idCardHeight: true,
        idCardLogoPosition: true,
        idCardNamePosition: true,
        idCardPhotoPosition: true,
        idCardNationalIdPosition: true,
        idCardProgramPosition: true,
        idCardCenterNamePosition: true,
        idCardAdditionalText: true,
        idCardAdditionalTextPosition: true,
        idCardQrCodePosition: true,
        idCardLogoSize: true,
        idCardPhotoSize: true,
        idCardNameSize: true,
        idCardNationalIdSize: true,
        idCardProgramSize: true,
        idCardCenterNameSize: true,
        idCardAdditionalTextSize: true,
        idCardQrCodeSize: true,
        idCardLogoVisible: true,
        idCardPhotoVisible: true,
        idCardNameVisible: true,
        idCardNationalIdVisible: true,
        idCardProgramVisible: true,
        idCardCenterNameVisible: true,
        idCardAdditionalTextVisible: true,
        idCardQrCodeVisible: true,
      },
    });

    // إعطاء قيم افتراضية إذا لم تكن موجودة
    if (!settings) {
      return {
        centerName: 'مركز التدريب',
        centerLogo: null,
        idCardBackgroundImage: null,
        idCardWidth: 320,
        idCardHeight: 200,
        idCardLogoPosition: { x: 10, y: 10 },
        idCardNamePosition: { x: 80, y: 60 },
        idCardPhotoPosition: { x: 200, y: 40 },
        idCardNationalIdPosition: { x: 80, y: 90 },
        idCardProgramPosition: { x: 80, y: 120 },
        idCardCenterNamePosition: { x: 150, y: 160 },
        idCardAdditionalText: null,
        idCardAdditionalTextPosition: { x: 80, y: 180 },
        idCardQrCodePosition: { x: 250, y: 130 },
        idCardLogoSize: { width: 50, height: 50 },
        idCardPhotoSize: { width: 80, height: 100 },
        idCardNameSize: 16,
        idCardNationalIdSize: 12,
        idCardProgramSize: 14,
        idCardCenterNameSize: 12,
        idCardAdditionalTextSize: 10,
        idCardQrCodeSize: { width: 60, height: 60 },
        idCardLogoVisible: true,
        idCardPhotoVisible: true,
        idCardNameVisible: true,
        idCardNationalIdVisible: true,
        idCardProgramVisible: true,
        idCardCenterNameVisible: true,
        idCardAdditionalTextVisible: true,
        idCardQrCodeVisible: true,
      };
    }

    // ملء القيم المفقودة بالقيم الافتراضية
    return {
      centerName: settings.centerName || 'مركز التدريب',
      centerLogo: settings.centerLogo,
      idCardBackgroundImage: settings.idCardBackgroundImage,
      idCardWidth: settings.idCardWidth || 320,
      idCardHeight: settings.idCardHeight || 200,
      idCardLogoPosition: settings.idCardLogoPosition || { x: 10, y: 10 },
      idCardNamePosition: settings.idCardNamePosition || { x: 80, y: 60 },
      idCardPhotoPosition: settings.idCardPhotoPosition || { x: 200, y: 40 },
      idCardNationalIdPosition: settings.idCardNationalIdPosition || { x: 80, y: 90 },
      idCardProgramPosition: settings.idCardProgramPosition || { x: 80, y: 120 },
      idCardCenterNamePosition: settings.idCardCenterNamePosition || { x: 150, y: 160 },
      idCardAdditionalText: settings.idCardAdditionalText,
      idCardAdditionalTextPosition: settings.idCardAdditionalTextPosition || { x: 80, y: 180 },
      idCardQrCodePosition: settings.idCardQrCodePosition || { x: 250, y: 130 },
      idCardLogoSize: settings.idCardLogoSize || { width: 50, height: 50 },
      idCardPhotoSize: settings.idCardPhotoSize || { width: 80, height: 100 },
      idCardNameSize: settings.idCardNameSize || 16,
      idCardNationalIdSize: settings.idCardNationalIdSize || 12,
      idCardProgramSize: settings.idCardProgramSize || 14,
      idCardCenterNameSize: settings.idCardCenterNameSize || 12,
      idCardAdditionalTextSize: settings.idCardAdditionalTextSize || 10,
      idCardQrCodeSize: settings.idCardQrCodeSize || { width: 60, height: 60 },
      idCardLogoVisible: settings.idCardLogoVisible !== false, // true إذا كانت null أو undefined
      idCardPhotoVisible: settings.idCardPhotoVisible !== false,
      idCardNameVisible: settings.idCardNameVisible !== false,
      idCardNationalIdVisible: settings.idCardNationalIdVisible !== false,
      idCardProgramVisible: settings.idCardProgramVisible !== false,
      idCardCenterNameVisible: settings.idCardCenterNameVisible !== false,
      idCardAdditionalTextVisible: settings.idCardAdditionalTextVisible !== false,
      idCardQrCodeVisible: settings.idCardQrCodeVisible !== false,
    };
  }

  // الحصول على جميع المتدربين مع حالة الكارنيهات
  async getAllTraineesWithIdCardStatus(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'not_printed' | 'printed' | 'delivered' | 'not_delivered';
    programId?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    // بناء شرط البحث
    const where: any = {};
    
    if (filters?.search) {
      where.OR = [
        { nameAr: { contains: filters.search } },
        { nameEn: { contains: filters.search } },
        { nationalId: { contains: filters.search } },
        { phone: { contains: filters.search } },
      ];
    }
    
    if (filters?.programId) {
      where.programId = filters.programId;
    }

    // جلب المتدربين مع بيانات الطباعة
    const [trainees, total] = await Promise.all([
      this.prisma.trainee.findMany({
        where,
        include: {
          program: {
            select: {
              id: true,
              nameAr: true,
            },
          },
          idCardPrints: {
            include: {
              printedBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
              deliveredBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              printedAt: 'desc',
            },
            take: 1, // أحدث طباعة فقط
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.trainee.count({ where }),
    ]);

    // معالجة البيانات وإضافة حالة الكارنيه
    const traineesWithStatus = trainees.map(trainee => {
      const latestPrint = trainee.idCardPrints[0];
      
      let status: string;
      let statusColor: string;
      let canDeliver = false;
      let canPrint = true;

      if (!latestPrint) {
        status = 'لم يتم الطباعة';
        statusColor = 'gray';
      } else if (latestPrint.isDelivered) {
        status = 'تم التسليم';
        statusColor = 'green';
      } else {
        status = 'مطبوع - لم يتم التسليم';
        statusColor = 'orange';
        canDeliver = true;
      }

      return {
        ...trainee,
        idCardStatus: {
          status,
          statusColor,
          canDeliver,
          canPrint,
          printedAt: latestPrint?.printedAt || null,
          printedBy: latestPrint?.printedBy || null,
          deliveredAt: latestPrint?.deliveredAt || null,
          deliveredBy: latestPrint?.deliveredBy || null,
          deliveryNotes: latestPrint?.deliveryNotes || null,
          printId: latestPrint?.id || null,
        },
        idCardPrints: undefined, // إزالة البيانات الخام
      };
    });

    // فلترة حسب الحالة إذا طُلب ذلك
    let filteredTrainees = traineesWithStatus;
    if (filters?.status) {
      filteredTrainees = traineesWithStatus.filter(trainee => {
        const print = trainee.idCardStatus;
        switch (filters.status) {
          case 'not_printed':
            return !print.printedAt;
          case 'printed':
            return print.printedAt && !print.deliveredAt;
          case 'delivered':
            return print.deliveredAt;
          case 'not_delivered':
            return print.printedAt && !print.deliveredAt;
          default:
            return true;
        }
      });
    }

    const totalPages = Math.ceil(total / limit);

    return {
      data: filteredTrainees,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // تحديث حالة التسليم
  async updateDeliveryStatus(printId: number, updateDto: UpdateDeliveryStatusDto, userId: string) {
    const { isDelivered, deliveryNotes } = updateDto;

    // التحقق من وجود سجل الطباعة
    const existingPrint = await this.prisma.idCardPrint.findUnique({
      where: { id: printId },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
          },
        },
      },
    });

    if (!existingPrint) {
      throw new Error('سجل الطباعة غير موجود');
    }

    // تحديث حالة التسليم
    const updatedPrint = await this.prisma.idCardPrint.update({
      where: { id: printId },
      data: {
        isDelivered,
        deliveredAt: isDelivered ? new Date() : null,
        deliveredById: isDelivered ? userId : null,
        deliveryNotes: deliveryNotes || null,
      },
      include: {
        trainee: {
          select: {
            id: true,
            nameAr: true,
          },
        },
        printedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveredBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      message: isDelivered 
        ? `تم تسجيل تسليم كارنيه ${existingPrint.trainee.nameAr} بنجاح`
        : `تم إلغاء تسليم كارنيه ${existingPrint.trainee.nameAr}`,
      data: updatedPrint,
    };
  }

  // الحصول على إحصائيات الكارنيهات
  async getIdCardStatistics(allowedProgramIds?: number[]) {
    const traineeWhere = allowedProgramIds ? { programId: { in: allowedProgramIds } } : {};
    
    const [
      totalTrainees,
      notPrintedCount,
      printedNotDeliveredCount,
      deliveredCount,
    ] = await Promise.all([
      this.prisma.trainee.count({ where: traineeWhere }),
      
      // عدد المتدربين الذين لم يتم طباعة كارنيهاتهم
      this.prisma.trainee.count({
        where: {
          ...traineeWhere,
          idCardPrints: {
            none: {},
          },
        },
      }),
      
      // عدد الكارنيهات المطبوعة غير المسلمة
      this.prisma.idCardPrint.count({
        where: {
          isDelivered: false,
          ...(allowedProgramIds ? { trainee: { programId: { in: allowedProgramIds } } } : {}),
        },
      }),
      
      // عدد الكارنيهات المسلمة
      this.prisma.idCardPrint.count({
        where: {
          isDelivered: true,
          ...(allowedProgramIds ? { trainee: { programId: { in: allowedProgramIds } } } : {}),
        },
      }),
    ]);

    const printedCount = printedNotDeliveredCount + deliveredCount;

    return {
      totalTrainees,
      notPrinted: notPrintedCount,
      printed: printedCount,
      printedNotDelivered: printedNotDeliveredCount,
      delivered: deliveredCount,
      printedPercentage: totalTrainees > 0 ? ((printedCount / totalTrainees) * 100).toFixed(1) : '0',
      deliveredPercentage: printedCount > 0 ? ((deliveredCount / printedCount) * 100).toFixed(1) : '0',
    };
  }
} 