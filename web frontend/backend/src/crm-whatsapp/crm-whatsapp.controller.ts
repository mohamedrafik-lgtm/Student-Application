import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CrmWhatsAppService } from './crm-whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('crm-whatsapp')
@ApiBearerAuth()
@Controller('crm-whatsapp')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CrmWhatsAppController {
  constructor(private readonly crmWhatsAppService: CrmWhatsAppService) {}

  @Get('channels')
  @RequirePermission('crm.channels', 'view')
  @ApiOperation({ summary: 'الحصول على جميع قنوات واتساب CRM' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب القنوات بنجاح' })
  async getChannels() {
    return await this.crmWhatsAppService.getChannels();
  }

  @Post('channels')
  @RequirePermission('crm.channels', 'manage')
  @ApiOperation({ summary: 'إنشاء قناة واتساب جديدة' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'تم إنشاء القناة بنجاح' })
  async createChannel(@Body() body: { name: string }, @Request() req) {
    const channel = await this.crmWhatsAppService.createChannel(body.name, req.user.userId);
    return { success: true, channel };
  }

  @Get('channels/:id/status')
  @RequirePermission('crm.channels', 'view')
  @ApiOperation({ summary: 'حالة قناة محددة' })
  async getChannelStatus(@Param('id') id: string) {
    return await this.crmWhatsAppService.getChannelStatus(id);
  }

  @Post('channels/:id/connect-qr')
  @RequirePermission('crm.channels', 'manage')
  @ApiOperation({ summary: 'بدء اتصال قناة عبر QR Code' })
  async connectWithQR(@Param('id') id: string) {
    return await this.crmWhatsAppService.connectChannelWithQR(id);
  }

  @Post('channels/:id/connect-pair')
  @RequirePermission('crm.channels', 'manage')
  @ApiOperation({ summary: 'بدء اتصال قناة عبر Pair Code' })
  async connectWithPairCode(@Param('id') id: string, @Body() body: { phoneNumber: string }) {
    return await this.crmWhatsAppService.connectChannelWithPairCode(id, body.phoneNumber);
  }

  @Post('channels/:id/disconnect')
  @RequirePermission('crm.channels', 'manage')
  @ApiOperation({ summary: 'قطع اتصال قناة' })
  async disconnectChannel(@Param('id') id: string) {
    return await this.crmWhatsAppService.disconnectChannel(id);
  }

  @Delete('channels/:id')
  @RequirePermission('crm.channels', 'manage')
  @ApiOperation({ summary: 'حذف قناة' })
  async deleteChannel(@Param('id') id: string) {
    return await this.crmWhatsAppService.deleteChannel(id);
  }

  @Post('channels/:id/regenerate-qr')
  @RequirePermission('crm.channels', 'manage')
  @ApiOperation({ summary: 'إعادة توليد QR Code' })
  async regenerateQR(@Param('id') id: string) {
    return await this.crmWhatsAppService.regenerateQR(id);
  }

  @Post('channels/:id/send-message')
  @RequirePermission('crm.channels', 'manage')
  @ApiOperation({ summary: 'إرسال رسالة عبر قناة محددة' })
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { phoneNumber: string; message: string }
  ) {
    const success = await this.crmWhatsAppService.sendMessage(id, body.phoneNumber, body.message);
    return {
      success,
      message: success ? 'تم إرسال الرسالة بنجاح' : 'فشل في إرسال الرسالة'
    };
  }
}
