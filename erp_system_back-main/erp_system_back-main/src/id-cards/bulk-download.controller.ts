import { Controller, Post, Body, Res, UseGuards, HttpException, HttpStatus, Req } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulkDownloadService } from './bulk-download.service';
import { UserProgramAccessService } from '../users/user-program-access.service';

interface BulkDownloadDto {
  traineeIds?: number[]; // معرفات متدربين محددين
  programId?: number; // أو برنامج تدريبي كامل
  downloadAll?: boolean; // أو كل الكارنيهات
}

@Controller('id-cards')
@UseGuards(JwtAuthGuard)
export class BulkDownloadController {
  constructor(
    private readonly bulkDownloadService: BulkDownloadService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  @Post('bulk-download')
  async bulkDownload(
    @Body() dto: BulkDownloadDto,
    @Res() res: Response,
    @Req() req,
  ) {
    try {
      console.log('طلب تحميل جماعي:', dto);

      // التحقق من صحة الطلب
      if (!dto.traineeIds && !dto.programId && !dto.downloadAll) {
        throw new HttpException(
          'يجب تحديد المتدربين أو البرنامج أو التحميل الكامل',
          HttpStatus.BAD_REQUEST,
        );
      }

      // تطبيق فلتر البرامج المسموحة
      if (dto.programId) {
        await this.userProgramAccessService.applyProgramFilter(req.user.userId, dto.programId);
      } else if (dto.downloadAll) {
        const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
        if (allowedProgramIds.length > 0) {
          // المستخدم مقيد ببرامج محددة - لا يمكنه التحميل الكامل
          dto.downloadAll = false;
          (dto as any).allowedProgramIds = allowedProgramIds;
        }
      }

      // إنشاء PDF
      const { filePath, fileName, totalCards } = await this.bulkDownloadService.generateBulkPDF(dto);

      console.log(`تم إنشاء PDF: ${fileName} مع ${totalCards} كارنيه`);

      // إعداد headers للتحميل
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('X-Total-Cards', totalCards.toString());
      
      // إضافة CORS headers للسماح بقراءة custom headers
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Cards, Content-Disposition');
      
      console.log(`إرسال headers: X-Total-Cards=${totalCards}, Content-Disposition=${encodeURIComponent(fileName)}`);

      // إرسال الملف
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('خطأ في إرسال الملف:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'فشل في إرسال الملف' });
          }
        } else {
          console.log('تم إرسال الملف بنجاح، جاري الحذف...');
          // حذف الملف بعد الإرسال
          this.bulkDownloadService.cleanupFile(filePath);
        }
      });

    } catch (error) {
      console.error('خطأ في التحميل الجماعي:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'حدث خطأ أثناء إنشاء ملف الكارنيهات',
          error: error.message,
        });
      }
    }
  }
}
