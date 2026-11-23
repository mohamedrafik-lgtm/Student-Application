import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@Controller('backup')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  // ==================== الطرق الثابتة أولاً (قبل :id) ====================

  /** جلب قائمة النسخ الاحتياطية */
  @Get()
  @RequirePermission('dashboard.backup', 'view')
  async getBackups() {
    const backups = await this.backupService.getBackupList();
    return { success: true, data: backups };
  }

  /** جلب إعدادات النسخ الاحتياطي */
  @Get('settings')
  @RequirePermission('dashboard.backup', 'view')
  async getSettings() {
    const settings = await this.backupService.getSettings();
    return { success: true, data: settings };
  }

  /** إنشاء نسخة احتياطية جديدة */
  @Post()
  @RequirePermission('dashboard.backup', 'create')
  async createBackup(
    @Body() body: { type?: string; notes?: string },
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const result = await this.backupService.createBackup(
      userId,
      body.type || 'full',
      body.notes,
    );
    return result;
  }

  /** تحديث إعدادات النسخ الاحتياطي */
  @Post('settings')
  @RequirePermission('dashboard.backup', 'create')
  async updateSettings(
    @Body() body: { autoBackup?: boolean; frequency?: string; maxBackups?: number },
  ) {
    const settings = await this.backupService.updateSettings(body);
    return { success: true, data: settings };
  }

  /** استعادة من ملف مرفوع */
  @Post('restore/upload')
  @RequirePermission('dashboard.backup', 'restore')
  @UseInterceptors(FileInterceptor('file'))
  async restoreFromFile(@UploadedFile() file: Express.Multer.File) {
    return this.backupService.restoreFromFile(file);
  }

  /** تشغيل النسخ الاحتياطي التلقائي يدوياً (للاختبار) */
  @Post('run-scheduled')
  @RequirePermission('dashboard.backup', 'create')
  async runScheduled() {
    await this.backupService.runScheduledBackup();
    return { success: true, message: 'تم تشغيل النسخ الاحتياطي المجدول' };
  }

  // ==================== الطرق ذات المعاملات (:id) ====================

  /** تحميل نسخة احتياطية */
  @Get(':id/download')
  @RequirePermission('dashboard.backup', 'create')
  async downloadBackup(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { filePath, filename } = await this.backupService.downloadBackup(id);
    res.download(filePath, filename);
  }

  /** حذف نسخة احتياطية */
  @Delete(':id')
  @RequirePermission('dashboard.backup', 'create')
  async deleteBackup(@Param('id', ParseIntPipe) id: number) {
    return this.backupService.deleteBackup(id);
  }

  /** استعادة نسخة احتياطية من سجل موجود */
  @Post(':id/restore')
  @RequirePermission('dashboard.backup', 'restore')
  async restoreBackup(@Param('id', ParseIntPipe) id: number) {
    return this.backupService.restoreBackup(id);
  }
}
