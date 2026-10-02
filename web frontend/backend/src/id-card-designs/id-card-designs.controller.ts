import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IdCardDesignsService } from './id-card-designs.service';
import { CreateIdCardDesignDto } from './dto/create-id-card-design.dto';
import { UpdateIdCardDesignDto } from './dto/update-id-card-design.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('id-card-designs')
@UseGuards(JwtAuthGuard)
export class IdCardDesignsController {
  constructor(private readonly idCardDesignsService: IdCardDesignsService) {}

  // إنشاء تصميم جديد
  @Post()
  async create(@Body() createDto: CreateIdCardDesignDto, @Request() req) {
    const design = await this.idCardDesignsService.create(createDto, req.user?.id);
    return {
      success: true,
      message: 'تم إنشاء التصميم بنجاح',
      design,
    };
  }

  // الحصول على جميع التصاميم
  @Get()
  async findAll(
    @Query('includeInactive') includeInactive?: string,
    @Query('programId') programId?: string
  ) {
    const designs = await this.idCardDesignsService.findAll(
      includeInactive === 'true',
      programId ? parseInt(programId) : undefined
    );
    return {
      success: true,
      designs,
    };
  }

  // الحصول على التصميم الافتراضي
  @Get('default')
  async findDefault() {
    const design = await this.idCardDesignsService.findDefault();
    return {
      success: true,
      design,
    };
  }

  // الحصول على تصميم محدد
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const design = await this.idCardDesignsService.findOne(id);
    return {
      success: true,
      design,
    };
  }

  // تحديث تصميم
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateIdCardDesignDto) {
    const design = await this.idCardDesignsService.update(id, updateDto);
    return {
      success: true,
      message: 'تم تحديث التصميم بنجاح',
      design,
    };
  }

  // تحديث عناصر التصميم فقط (endpoint مخصص للأداء السريع)
  @Patch(':id/elements')
  async updateElements(@Param('id') id: string, @Body('elements') elements: any[]) {
    const design = await this.idCardDesignsService.updateElements(id, elements);
    return {
      success: true,
      message: 'تم تحديث عناصر التصميم بنجاح',
      design,
    };
  }

  // حذف تصميم (إلغاء تفعيل)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.idCardDesignsService.remove(id);
    return {
      success: true,
      message: 'تم حذف التصميم بنجاح',
    };
  }

  // تعيين تصميم كافتراضي (عام أو لبرنامج)
  @Patch(':id/set-default')
  async setAsDefault(
    @Param('id') id: string, 
    @Body('programId') programId?: number
  ) {
    const design = await this.idCardDesignsService.setAsDefault(id, programId);
    return {
      success: true,
      message: programId ? 'تم تعيين التصميم كافتراضي للبرنامج بنجاح' : 'تم تعيين التصميم كافتراضي عام بنجاح',
      design,
    };
  }

  // الحصول على التصميم المناسب لمتدرب
  @Get('for-trainee/:traineeId')
  async getDesignForTrainee(@Param('traineeId') traineeId: string) {
    const design = await this.idCardDesignsService.getDesignForTrainee(parseInt(traineeId));
    return {
      success: true,
      design,
    };
  }

  // الحصول على التصميم الافتراضي لبرنامج
  @Get('program/:programId/default')
  async getProgramDefaultDesign(@Param('programId') programId: string) {
    const design = await this.idCardDesignsService.getProgramDefaultDesign(parseInt(programId));
    return {
      success: true,
      design,
    };
  }

  // نسخ تصميم
  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @Body('name') name?: string) {
    const design = await this.idCardDesignsService.duplicate(id, name);
    return {
      success: true,
      message: 'تم نسخ التصميم بنجاح',
      design,
    };
  }

  // تصدير التصميم كملف JSON
  @Get(':id/export')
  async exportDesign(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    try {
      console.log(`بدء تصدير التصميم: ${id}`);
      
      const exportData = await this.idCardDesignsService.exportDesign(id);
      const design = await this.idCardDesignsService.findOne(id);
      
      console.log(`تم الحصول على بيانات التصميم: ${design.name}`);
      
      // تحديد اسم الملف (استخدام أحرف ASCII فقط لتجنب مشاكل header)
      const safeName = design.name
        .replace(/[^\w\s-]/g, '') // إزالة الأحرف الخاصة
        .replace(/\s+/g, '_') // استبدال المسافات بـ underscore
        .substring(0, 50); // تحديد الطول
      
      const fileName = `design-${safeName || 'unnamed'}-${Date.now()}.json`;
      
      console.log(`اسم الملف المُنشأ: ${fileName}`);
      
      // إعداد headers للتحميل مع تشفير UTF-8
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      
      console.log('تم إعداد headers بنجاح، إرسال البيانات...');
      
      return exportData;
    } catch (error) {
      console.error('خطأ في تصدير التصميم:', error);
      res.status(400);
      return {
        success: false,
        message: error.message || 'حدث خطأ أثناء تصدير التصميم',
      };
    }
  }

  // استيراد التصميم من ملف JSON
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importDesign(
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      return {
        success: false,
        message: 'يرجى اختيار ملف للاستيراد',
      };
    }

    try {
      // قراءة محتوى الملف
      const fileContent = file.buffer.toString('utf8');
      const importData = JSON.parse(fileContent);
      
      // استيراد التصميم
      const design = await this.idCardDesignsService.importDesign(importData, req.user?.id);
      
      return {
        success: true,
        message: 'تم استيراد التصميم بنجاح',
        design,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'حدث خطأ أثناء استيراد التصميم',
      };
    }
  }

  // إلغاء تفعيل التصميم (بدلاً من الحذف النهائي)
  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    const design = await this.idCardDesignsService.deactivate(id);
    return {
      success: true,
      message: 'تم إلغاء تفعيل التصميم بنجاح',
      design,
    };
  }

  // تحديث التصاميم القديمة لتكون متاحة لكل البرامج
  @Post('migrate-legacy')
  async migrateLegacyDesigns() {
    // تحديث جميع التصاميم التي ليس لها programId لتكون عامة
    const updatedCount = await this.idCardDesignsService.migrateLegacyDesigns();
    return {
      success: true,
      message: `تم تحديث ${updatedCount} تصميم ليكون متاح لكل البرامج`,
      updatedCount,
    };
  }
}
