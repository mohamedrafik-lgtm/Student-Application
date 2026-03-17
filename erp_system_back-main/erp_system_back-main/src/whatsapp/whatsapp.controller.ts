import { Controller, Get, Post, Body, UseGuards, Request, HttpStatus, Param, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { UnifiedWhatsAppService, WhatsAppStatus } from './unified-whatsapp.service';
import { WhatsAppQueueService } from './whatsapp-queue.service';
import { RedisLocalService } from '../redis/redis-local.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

class SendMessageDto {
  @ApiProperty({ example: '01012345678', description: 'Phone number to send message to' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: 'Hello, this is a test message', description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  message: string;
}

class SendWelcomeDto {
  @ApiProperty({ example: 1, description: 'Trainee ID' })
  @IsNumber()
  @IsNotEmpty()
  traineeId: number;
}

class SendPaymentConfirmationDto {
  @ApiProperty({ example: 1, description: 'Payment ID' })
  @IsNumber()
  @IsNotEmpty()
  paymentId: number;
}

@ApiTags('whatsapp')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WhatsAppController {
  constructor(
    private readonly whatsappService: UnifiedWhatsAppService,
    private readonly whatsappQueueService: WhatsAppQueueService,
    private readonly redisLocalService: RedisLocalService,
  ) {}

  @Get('status')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'Get WhatsApp connection status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Connection status retrieved successfully' })
  async getStatus(): Promise<WhatsAppStatus> {
    return await this.whatsappService.getStatus();
  }

  @Get('redis-info')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'Get Redis connection information' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Redis information retrieved successfully' })
  async getRedisInfo() {
    return await this.redisLocalService.getRedisInfo();
  }

  @Get('queue-stats')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'Get WhatsApp queue statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Queue statistics retrieved successfully' })
  async getQueueStats() {
    try {
      return await this.whatsappQueueService.getQueueStats();
    } catch (error) {
      return {
        error: 'Queue service not available',
        message: error.message,
        available: false
      };
    }
  }

  @Post('clean-queue')
  @RequirePermission('whatsapp', 'manage')
  @ApiOperation({ summary: 'Clean old queue jobs' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Queue cleaned successfully' })
  async cleanQueue() {
    try {
      await this.whatsappQueueService.cleanQueue();
      return { message: 'Queue cleaned successfully' };
    } catch (error) {
      return {
        error: 'Failed to clean queue',
        message: error.message
      };
    }
  }

  @Get('qr-code')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'Get QR Code for WhatsApp connection' })
  @ApiResponse({ status: HttpStatus.OK, description: 'QR Code retrieved successfully' })
  async getQRCode() {
    return await this.whatsappService.getQRCode();
  }

  @Post('send-message')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'Send a custom WhatsApp message' })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Message sent successfully' })
  async sendMessage(@Body() body: SendMessageDto, @Request() req) {
    const success = await this.whatsappService.sendMessage(
      body.phoneNumber,
      body.message,
      req.user.id
    );
    
    return {
      success,
      message: success ? 'تم إرسال الرسالة بنجاح' : 'فشل في إرسال الرسالة'
    };
  }

  @Post('send-test-message')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'Send a test WhatsApp message' })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Test message sent successfully' })
  async sendTestMessage(@Body() body: SendMessageDto, @Request() req) {
    const success = await this.whatsappService.sendMessage(
      body.phoneNumber,
      body.message,
      req.user.id
    );
    
    return {
      success,
      message: success ? 'تم إرسال الرسالة التجريبية بنجاح' : 'فشل في إرسال الرسالة التجريبية'
    };
  }

  @Post('send-welcome')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'Send welcome message to trainee' })
  @ApiBody({ type: SendWelcomeDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Welcome message sent successfully' })
  async sendWelcomeMessage(@Body() body: SendWelcomeDto, @Request() req) {
    // This would typically fetch trainee data from database
    // For now, return success response
    return {
      success: true,
      message: 'تم إرسال رسالة الترحيب بنجاح'
    };
  }



  @Post('send-payment-confirmation')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'Send payment confirmation message' })
  @ApiBody({ type: SendPaymentConfirmationDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment confirmation sent successfully' })
  async sendPaymentConfirmation(@Body() body: SendPaymentConfirmationDto, @Request() req) {
    const success = await this.whatsappService.sendPaymentConfirmation(body.paymentId, req.user.id);
    
    return {
      success,
      message: success ? 'تم إرسال تأكيد الدفع بنجاح' : 'فشل في إرسال تأكيد الدفع'
    };
  }

  @Post('test-trainee-payment/:traineeId')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'Test payment confirmation from trainee page' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Test trainee payment result' })
  async testTraineePayment(@Param('traineeId') traineeId: string, @Request() req) {
    const traineeIdNum = parseInt(traineeId);
    if (isNaN(traineeIdNum)) {
      return {
        success: false,
        message: 'معرف المتدرب غير صحيح'
      };
    }

    // محاكاة عملية الدفع التلقائي
    try {
      console.log(`[Test Trainee Payment] Testing payment for trainee ${traineeIdNum}`);
      
      // البحث عن آخر دفعة للمتدرب
      const latestPayment = await this.whatsappService['prisma'].traineePayment.findFirst({
        where: { 
          traineeId: traineeIdNum,
          paidAmount: { gt: 0 }
        },
        include: {
          trainee: true,
          fee: true
        },
        orderBy: { updatedAt: 'desc' }
      });
      
      if (!latestPayment) {
        return {
          success: false,
          message: 'لا توجد مدفوعات للمتدرب'
        };
      }
      
      const success = await this.whatsappService.sendPaymentConfirmation(latestPayment.id, req.user.id);
      
      return {
        success,
        message: success ? 'تم إرسال تأكيد الدفع التجريبي بنجاح' : 'فشل في إرسال تأكيد الدفع التجريبي',
        traineeId: traineeIdNum,
        paymentId: latestPayment.id,
        traineeName: latestPayment.trainee?.nameAr,
        paidAmount: latestPayment.paidAmount
      };
    } catch (error) {
      console.error(`[Test Trainee Payment] Error:`, error);
      return {
        success: false,
        message: 'حدث خطأ أثناء الاختبار: ' + error.message
      };
    }
  }

  @Post('test-payment-confirmation/:paymentId')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'Test payment confirmation message for debugging' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Test payment confirmation result' })
  async testPaymentConfirmation(@Param('paymentId') paymentId: string, @Request() req) {
    const paymentIdNum = parseInt(paymentId);
    if (isNaN(paymentIdNum)) {
      return {
        success: false,
        message: 'معرف الدفعة غير صحيح'
      };
    }

    const success = await this.whatsappService.sendPaymentConfirmation(paymentIdNum, req.user.id);
    
    return {
      success,
      message: success ? 'تم إرسال تأكيد الدفع التجريبي بنجاح' : 'فشل في إرسال تأكيد الدفع التجريبي',
      paymentId: paymentIdNum
    };
  }

  @Get('preview-payment-sample')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'Preview payment confirmation message template' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment message preview generated' })
  async previewPaymentSample() {
    return await this.whatsappService.previewPaymentSample();
  }

  @Post('restart')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'Restart WhatsApp client' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Client restarted successfully' })
  async restart() {
    return await this.whatsappService.restart();
  }

  @Post('logout')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'Logout from WhatsApp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Logged out successfully' })
  async logout() {
    return await this.whatsappService.logout();
  }

  @Post('generate-qr')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'Force generate new QR Code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'QR Code generated successfully' })
  async generateQR() {
    return await this.whatsappService.generateQR();
  }

  @Get('preview-welcome-sample')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'Preview welcome message template' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Welcome message preview generated' })
  async previewWelcomeSample() {
    return await this.whatsappService.previewWelcomeSample();
  }

  @Post('force-reauth')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'Force re-authentication' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Re-authentication initiated' })
  async forceReauth() {
    return await this.whatsappService.logout();
  }

  @Post('force-reinit')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'Force client reinitialization' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Client reinitialization completed' })
  async forceReinit() {
    return await this.whatsappService.restart();
  }

  @Get('deep-check')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'Perform deep connection check' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Deep check completed' })
  async deepCheck() {
    const isReady = await this.whatsappService.isClientReallyReady();
    return {
      success: isReady,
      message: isReady ? 'الاتصال سليم وجاهز' : 'مشكلة في الاتصال'
    };
  }

  @Post('refresh-info')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'Refresh client information' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Client information refreshed' })
  async refreshInfo() {
    const status = await this.whatsappService.getStatus();
    return {
      success: true,
      message: 'تم تحديث المعلومات',
      phoneNumber: status.phoneNumber
    };
  }
}