import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CrmInboxService } from './crm-inbox.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('crm-inbox')
@ApiBearerAuth()
@Controller('crm-inbox')
@UseGuards(JwtAuthGuard)
export class CrmInboxController {
  constructor(private readonly inboxService: CrmInboxService) {}

  // ===== إعدادات التوزيع =====

  @Get('settings')
  @UseGuards(PermissionGuard)
  @RequirePermission('crm.messages', 'view')
  @ApiOperation({ summary: 'الحصول على إعدادات توزيع الرسائل' })
  @ApiResponse({ status: HttpStatus.OK })
  async getSettings() {
    return await this.inboxService.getSettings();
  }

  @Put('settings')
  @UseGuards(PermissionGuard)
  @RequirePermission('crm.messages', 'manage')
  @ApiOperation({ summary: 'تحديث إعدادات توزيع الرسائل' })
  async updateSettings(@Body() body: { distributionMode: string }, @Request() req) {
    const settings = await this.inboxService.updateSettings(body.distributionMode, req.user.userId);
    return { success: true, settings };
  }

  // ===== المحادثات (بدون صلاحيات خاصة - متاح لجميع مستخدمي CRM) =====

  @Get('conversations')
  @ApiOperation({ summary: 'الحصول على المحادثات' })
  async getConversations(
    @Query('filter') filter: string = 'all',
    @Request() req,
  ) {
    return await this.inboxService.getConversations(req.user.userId, filter);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'الحصول على رسائل محادثة' })
  async getMessages(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return await this.inboxService.getMessages(id, parseInt(page), parseInt(limit));
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'إرسال رسالة' })
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Request() req,
  ) {
    const message = await this.inboxService.sendMessage(id, body.content, req.user.userId);
    return { success: true, message };
  }

  @Post('conversations/:id/media')
  @ApiOperation({ summary: 'إرسال صورة أو تسجيل صوتي' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 16 * 1024 * 1024 } }))
  async sendMedia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { mediaType: string; caption?: string },
    @Request() req,
  ) {
    if (!file) throw new Error('لم يتم إرفاق ملف');
    const mediaType = body.mediaType as 'image' | 'audio';
    if (!['image', 'audio'].includes(mediaType)) throw new Error('نوع ملف غير مدعوم');
    const message = await this.inboxService.sendMediaMessage(id, req.user.userId, file, mediaType, body.caption);
    return { success: true, message };
  }

  @Post('conversations/:id/claim')
  @ApiOperation({ summary: 'حجز محادثة' })
  async claimConversation(@Param('id') id: string, @Request() req) {
    const conversation = await this.inboxService.claimConversation(id, req.user.userId);
    return { success: true, conversation };
  }

  @Post('conversations/:id/release')
  @ApiOperation({ summary: 'إلغاء حجز محادثة' })
  async releaseConversation(@Param('id') id: string, @Request() req) {
    const conversation = await this.inboxService.releaseConversation(id, req.user.userId);
    return { success: true, conversation };
  }

  @Post('conversations/:id/close')
  @ApiOperation({ summary: 'إغلاق محادثة' })
  async closeConversation(@Param('id') id: string) {
    const conversation = await this.inboxService.closeConversation(id);
    return { success: true, conversation };
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'تعليم المحادثة كمقروءة' })
  async markAsRead(@Param('id') id: string) {
    await this.inboxService.markAsRead(id);
    return { success: true };
  }
}
