import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIdCardDesignDto } from './dto/create-id-card-design.dto';
import { UpdateIdCardDesignDto } from './dto/update-id-card-design.dto';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class IdCardDesignsService {
  constructor(private prisma: PrismaService) {}

  // إنشاء تصميم جديد
  async create(createDto: CreateIdCardDesignDto, createdBy?: string) {
    // إذا كان التصميم مطلوب أن يكون افتراضي عام، قم بإلغاء الافتراضية من التصاميم العامة الأخرى
    if (createDto.isDefault) {
      await this.prisma.idCardDesign.updateMany({
        where: { 
          isDefault: true,
          programId: null // التصاميم العامة فقط
        },
        data: { isDefault: false },
      });
    }

    // إذا كان التصميم مطلوب أن يكون افتراضي لبرنامج، قم بإلغاء الافتراضية من تصاميم هذا البرنامج
    if (createDto.isProgramDefault && createDto.programId) {
      await this.prisma.idCardDesign.updateMany({
        where: { 
          programId: createDto.programId,
          isProgramDefault: true 
        },
        data: { isProgramDefault: false },
      });
    }

    // تحضير بيانات التصميم
    const designData = {
      elements: createDto.elements,
      version: createDto.version || '1.0',
      lastModified: new Date().toISOString(),
    };

    const design = await this.prisma.idCardDesign.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        isDefault: createDto.isDefault || false,
        programId: createDto.programId || null,
        isProgramDefault: createDto.isProgramDefault || false,
        width: createDto.width,
        height: createDto.height,
        backgroundImage: createDto.backgroundImage,
        backgroundColor: createDto.backgroundColor,
        designData: JSON.parse(JSON.stringify(designData)) as Prisma.JsonObject,
        version: createDto.version || '1.0',
        tags: createDto.tags ? JSON.parse(JSON.stringify(createDto.tags)) as Prisma.JsonArray : undefined,
        createdBy,
      },
      include: {
        program: true, // تضمين بيانات البرنامج
      },
    });

    return design;
  }

  // الحصول على جميع التصاميم
  async findAll(includeInactive = false, programId?: number) {
    const where: Prisma.IdCardDesignWhereInput = {};
    
    if (!includeInactive) {
      where.isActive = true;
    }

    // إذا تم تحديد برنامج، اعرض تصاميم هذا البرنامج + التصاميم العامة
    if (programId) {
      where.OR = [
        { programId },
        { programId: null }, // التصاميم العامة
      ];
    }

    return this.prisma.idCardDesign.findMany({
      where,
      include: {
        program: true, // تضمين بيانات البرنامج التدريبي
      },
      orderBy: [
        { isDefault: 'desc' },        // التصميم الافتراضي العام أولاً
        { isProgramDefault: 'desc' }, // تصاميم البرامج الافتراضية ثانياً
        { updatedAt: 'desc' },        // ثم الأحدث
      ],
    });
  }

  // الحصول على تصميم بالمعرف
  async findOne(id: string) {
    const design = await this.prisma.idCardDesign.findUnique({
      where: { id },
    });

    if (!design) {
      throw new NotFoundException(`التصميم بالمعرف ${id} غير موجود`);
    }

    return design;
  }

  // الحصول على التصميم الافتراضي العام
  async findDefault() {
    let defaultDesign = await this.prisma.idCardDesign.findFirst({
      where: { 
        isDefault: true,
        isActive: true,
        programId: null // التصميم العام فقط
      },
      include: {
        program: true,
      },
    });

    // إذا لم يوجد تصميم افتراضي، أنشئ واحد
    if (!defaultDesign) {
      defaultDesign = await this.createDefaultDesign();
    }

    return defaultDesign;
  }

  // الحصول على التصميم المناسب لمتدرب (حسب برنامجه)
  async getDesignForTrainee(traineeId: number) {
    // الحصول على بيانات المتدرب وبرنامجه
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      include: { program: true },
    });

    if (!trainee) {
      throw new NotFoundException('المتدرب غير موجود');
    }

    // إذا كان المتدرب مسجل في برنامج، ابحث عن تصميم البرنامج
    if (trainee.programId) {
      const programDesign = await this.prisma.idCardDesign.findFirst({
        where: {
          programId: trainee.programId,
          isProgramDefault: true,
          isActive: true,
        },
        include: { program: true },
      });

      if (programDesign) {
        return programDesign;
      }
    }

    // إذا لم يوجد تصميم للبرنامج، استخدم التصميم العام الافتراضي
    return this.findDefault();
  }

  // الحصول على التصميم الافتراضي لبرنامج معين
  async getProgramDefaultDesign(programId: number) {
    return this.prisma.idCardDesign.findFirst({
      where: {
        programId,
        isProgramDefault: true,
        isActive: true,
      },
      include: { program: true },
    });
  }

  // تحديث تصميم
  async update(id: string, updateDto: UpdateIdCardDesignDto) {
    const existingDesign = await this.findOne(id);

    // إذا كان التصميم مطلوب أن يكون افتراضي، قم بإلغاء الافتراضية من التصاميم الأخرى
    if (updateDto.isDefault && !existingDesign.isDefault) {
      await this.prisma.idCardDesign.updateMany({
        where: { 
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false },
      });
    }

    // تحضير بيانات التصميم المحدثة
    let designData = existingDesign.designData as any;
    
    if (updateDto.elements) {
      designData = {
        ...designData,
        elements: updateDto.elements,
        lastModified: new Date().toISOString(),
      };
    }

    return this.prisma.idCardDesign.update({
      where: { id },
      data: {
        ...updateDto,
        designData: JSON.parse(JSON.stringify(designData)) as Prisma.JsonObject,
        tags: updateDto.tags ? JSON.parse(JSON.stringify(updateDto.tags)) as Prisma.JsonArray : undefined,
      },
    });
  }

  // تحديث عناصر التصميم فقط (أسرع للتحديثات المتكررة)
  async updateElements(id: string, elements: any[]) {
    const existingDesign = await this.findOne(id);
    const designData = existingDesign.designData as any;
    
    const updatedDesignData = {
      ...designData,
      elements: elements,
      lastModified: new Date().toISOString(),
    };

    return this.prisma.idCardDesign.update({
      where: { id },
      data: {
        designData: JSON.parse(JSON.stringify(updatedDesignData)) as Prisma.JsonObject,
      },
    });
  }

  // حذف تصميم نهائياً
  async remove(id: string) {
    const design = await this.findOne(id);

    // منع حذف التصميم الافتراضي إذا كان الوحيد
    if (design.isDefault) {
      const otherActiveDesigns = await this.prisma.idCardDesign.count({
        where: { 
          id: { not: id },
          isActive: true 
        },
      });

      if (otherActiveDesigns === 0) {
        throw new BadRequestException('لا يمكن حذف التصميم الافتراضي الوحيد');
      }
    }

    // التحقق من استخدام التصميم في طباعات سابقة
    const printsCount = await this.prisma.idCardPrint.count({
      where: { designId: id },
    });

    if (printsCount > 0) {
      throw new BadRequestException(`لا يمكن حذف التصميم لأنه مُستخدم في ${printsCount} عملية طباعة. يمكنك إلغاء تفعيله بدلاً من ذلك.`);
    }

    // حذف نهائي من قاعدة البيانات
    return this.prisma.idCardDesign.delete({
      where: { id },
    });
  }

  // إلغاء تفعيل تصميم (حذف مؤقت)
  async deactivate(id: string) {
    const design = await this.findOne(id);

    // منع إلغاء تفعيل التصميم الافتراضي إذا كان الوحيد
    if (design.isDefault) {
      const otherActiveDesigns = await this.prisma.idCardDesign.count({
        where: { 
          id: { not: id },
          isActive: true 
        },
      });

      if (otherActiveDesigns === 0) {
        throw new BadRequestException('لا يمكن إلغاء تفعيل التصميم الافتراضي الوحيد');
      }
    }

    return this.prisma.idCardDesign.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // تعيين تصميم كافتراضي (عام أو لبرنامج)
  async setAsDefault(id: string, programId?: number) {
    const design = await this.prisma.idCardDesign.findUnique({
      where: { id },
      include: { program: true },
    });

    if (!design) {
      throw new NotFoundException(`التصميم بالمعرف ${id} غير موجود`);
    }

    if (!design.isActive) {
      throw new BadRequestException('لا يمكن تعيين تصميم غير نشط كافتراضي');
    }

    // تحديد نوع التصميم الافتراضي
    if (programId || design.programId) {
      // تعيين كافتراضي لبرنامج معين
      const targetProgramId = programId || design.programId;
      
      // إلغاء الافتراضية من تصاميم هذا البرنامج
      await this.prisma.idCardDesign.updateMany({
        where: { 
          programId: targetProgramId,
          isProgramDefault: true 
        },
        data: { isProgramDefault: false },
      });

      // تعيين التصميم الحالي كافتراضي للبرنامج
      return this.prisma.idCardDesign.update({
        where: { id },
        data: { 
          isProgramDefault: true,
          isDefault: false // لا يمكن أن يكون افتراضي عام وبرنامج في نفس الوقت
        },
        include: { program: true },
      });
    } else {
      // تعيين كافتراضي عام
      // إلغاء الافتراضية من جميع التصاميم العامة
      await this.prisma.idCardDesign.updateMany({
        where: { 
          programId: null,
          isDefault: true 
        },
        data: { isDefault: false },
      });

      // تعيين التصميم الحالي كافتراضي عام
      return this.prisma.idCardDesign.update({
        where: { id },
        data: { 
          isDefault: true,
          isProgramDefault: false // لا يمكن أن يكون افتراضي عام وبرنامج في نفس الوقت
        },
        include: { program: true },
      });
    }
  }

  // نسخ تصميم
  async duplicate(id: string, newName?: string) {
    const originalDesign = await this.findOne(id);

    const duplicatedDesign = await this.prisma.idCardDesign.create({
      data: {
        name: newName || `${originalDesign.name} (نسخة)`,
        description: originalDesign.description,
        isDefault: false, // النسخة لا تكون افتراضية
        width: originalDesign.width,
        height: originalDesign.height,
        backgroundImage: originalDesign.backgroundImage,
        backgroundColor: originalDesign.backgroundColor,
        designData: originalDesign.designData,
        version: originalDesign.version,
        tags: originalDesign.tags,
      },
    });

    return duplicatedDesign;
  }

  // إنشاء التصميم الافتراضي
  private async createDefaultDesign() {
    const defaultElements = [
      {
        id: 'logo',
        type: 'logo',
        position: { x: 240, y: 10 },
        size: { width: 70, height: 70 },
        visible: true,
        zIndex: 2,
        locked: false,
      },
      {
        id: 'photo',
        type: 'image',
        position: { x: 15, y: 40 },
        size: { width: 80, height: 100 },
        visible: true,
        zIndex: 1,
        locked: false,
      },
      {
        id: 'centerName',
        type: 'text',
        position: { x: 110, y: 15 },
        size: { width: 120, height: 25 },
        style: {
          fontSize: 14,
          fontWeight: 'bold',
          color: '#000000',
          textAlign: 'center',
          direction: 'rtl',
        },
        content: 'اسم المركز',
        visible: true,
        zIndex: 2,
        locked: false,
      },
      {
        id: 'name',
        type: 'text',
        position: { x: 110, y: 50 },
        size: { width: 200, height: 25 },
        style: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#000000',
          textAlign: 'right',
          direction: 'rtl',
        },
        content: 'اسم الطالب',
        visible: true,
        zIndex: 2,
        locked: false,
      },
      {
        id: 'nationalId',
        type: 'text',
        position: { x: 110, y: 80 },
        size: { width: 200, height: 20 },
        style: {
          fontSize: 12,
          color: '#333333',
          textAlign: 'right',
          direction: 'rtl',
        },
        content: 'الرقم القومي',
        visible: true,
        zIndex: 2,
        locked: false,
      },
      {
        id: 'program',
        type: 'text',
        position: { x: 110, y: 105 },
        size: { width: 200, height: 20 },
        style: {
          fontSize: 12,
          color: '#333333',
          textAlign: 'right',
          direction: 'rtl',
        },
        content: 'البرنامج',
        visible: true,
        zIndex: 2,
        locked: false,
      },
      {
        id: 'traineeId',
        type: 'text',
        position: { x: 110, y: 130 },
        size: { width: 120, height: 20 },
        style: {
          fontSize: 12,
          color: '#333333',
          textAlign: 'right',
          direction: 'rtl',
        },
        content: 'رقم المتدرب',
        visible: false,
        zIndex: 2,
        locked: false,
      },
      {
        id: 'qrCode',
        type: 'qr',
        position: { x: 15, y: 150 },
        size: { width: 45, height: 45 },
        visible: true,
        zIndex: 1,
        locked: false,
      },
      {
        id: 'barcode',
        type: 'barcode',
        position: { x: 70, y: 150 },
        size: { width: 150, height: 35 },
        style: {
          lineColor: '#000000',
          background: 'transparent',
        },
        visible: false, // مخفي افتراضياً
        zIndex: 1,
        locked: false,
      },
    ];

    const designData = {
      elements: defaultElements,
      version: '1.0',
      lastModified: new Date().toISOString(),
    };

    return this.prisma.idCardDesign.create({
      data: {
        name: 'التصميم الافتراضي',
        description: 'التصميم الافتراضي للكارنيهات',
        isDefault: true,
        width: 323,  // حجم الكريديت كارد الدقيق بالبكسل
        height: 204, // حجم الكريديت كارد الدقيق بالبكسل
        designData: JSON.parse(JSON.stringify(designData)) as Prisma.JsonObject,
        version: '1.0',
      },
      include: {
        program: true, // تضمين بيانات البرنامج (سيكون null للتصميم العام)
      },
    });
  }

  // تصدير التصميم كملف JSON شامل (مع الصور المدمجة)
  async exportDesign(id: string) {
    const design = await this.findOne(id);
    
    // إعداد البيانات للتصدير
    const exportData = {
      name: design.name,
      description: design.description,
      width: design.width,
      height: design.height,
      backgroundColor: design.backgroundColor,
      designData: design.designData,
      version: design.version,
      tags: design.tags,
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0'
    };

    // إذا كان هناك صورة خلفية، قم بتحويلها إلى base64
    if (design.backgroundImage) {
      try {
        let backgroundImageBase64 = '';
        
        // التحقق من نوع الرابط
        if (design.backgroundImage.startsWith('http')) {
          // رابط خارجي - لا يمكن تحويله
          exportData['backgroundImageUrl'] = design.backgroundImage;
        } else {
          // ملف محلي - قم بقراءته وتحويله
          const imagePath = path.join(process.cwd(), 'uploads', design.backgroundImage);
          if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const imageExtension = path.extname(design.backgroundImage).toLowerCase();
            const mimeType = this.getMimeType(imageExtension);
            backgroundImageBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
            exportData['backgroundImageData'] = backgroundImageBase64;
          }
        }
      } catch (error) {
        console.warn('فشل في تحويل صورة الخلفية:', error);
      }
    }

    return exportData;
  }

  // استيراد التصميم من ملف JSON
  async importDesign(importData: any, createdBy?: string) {
    // التحقق من صحة البيانات
    if (!importData.name || !importData.designData) {
      throw new BadRequestException('بيانات التصميم غير صحيحة');
    }

    // التأكد من عدم تعارض الاسم
    let finalName = importData.name;
    const existingDesign = await this.prisma.idCardDesign.findFirst({
      where: { name: finalName }
    });
    
    if (existingDesign) {
      finalName = `${importData.name} (مستورد ${new Date().getTime()})`;
    }

    // معالجة صورة الخلفية إذا كانت موجودة
    let backgroundImage = null;
    if (importData.backgroundImageData) {
      try {
        // استخراج البيانات من base64
        const matches = importData.backgroundImageData.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const extension = this.getExtensionFromMimeType(mimeType);
          
          // إنشاء اسم ملف فريد
          const fileName = `design-bg-${Date.now()}${extension}`;
          const filePath = path.join(process.cwd(), 'uploads', 'designs', fileName);
          
          // التأكد من وجود المجلد
          const uploadsDir = path.dirname(filePath);
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          // حفظ الملف
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(filePath, buffer);
          
          backgroundImage = `designs/${fileName}`;
        }
      } catch (error) {
        console.warn('فشل في حفظ صورة الخلفية:', error);
      }
    } else if (importData.backgroundImageUrl) {
      backgroundImage = importData.backgroundImageUrl;
    }

    // إنشاء التصميم الجديد
    const design = await this.prisma.idCardDesign.create({
      data: {
        name: finalName,
        description: importData.description || 'تصميم مستورد',
        isDefault: false, // التصاميم المستوردة لا تكون افتراضية
        width: importData.width || 323,
        height: importData.height || 204,
        backgroundImage,
        backgroundColor: importData.backgroundColor,
        designData: JSON.parse(JSON.stringify(importData.designData)) as Prisma.JsonObject,
        version: importData.version || '1.0',
        tags: importData.tags ? JSON.parse(JSON.stringify(importData.tags)) as Prisma.JsonArray : undefined,
        createdBy,
      },
    });

    return design;
  }

  // دالة مساعدة للحصول على نوع MIME من الامتداد
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    return mimeTypes[extension] || 'image/jpeg';
  }

  // دالة مساعدة للحصول على الامتداد من نوع MIME
  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg'
    };
    return extensions[mimeType] || '.jpg';
  }

  // تحديث التصاميم القديمة لتكون متاحة لكل البرامج
  async migrateLegacyDesigns(): Promise<number> {
    // جميع التصاميم القديمة ستكون متاحة لكل البرامج (programId = null)
    // لا نحتاج تحديث لأن القيمة الافتراضية null بالفعل
    // لكن يمكننا إضافة معلومات في الوصف
    
    const result = await this.prisma.idCardDesign.updateMany({
      where: {
        programId: null,
        description: { not: { contains: 'متاح لكل البرامج' } }
      },
      data: {
        description: {
          // إضافة ملاحظة للتصاميم القديمة
          set: 'تصميم عام متاح لكل البرامج التدريبية'
        }
      },
    });

    return result.count;
  }
}
