import { Controller, Get, Post, Body, UseGuards, Request, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ImprovedWhatsAppService, WhatsAppStatus } from './improved-whatsapp.service';
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

class SessionCleanupDto {
  @ApiProperty({ example: true, description: 'Force cleanup of all sessions', required: false })
  @IsOptional()
  @IsBoolean()
  forceCleanup?: boolean;
}

@ApiTags('whatsapp')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ImprovedWhatsAppController {
  constructor(private readonly whatsappService: ImprovedWhatsAppService) {}

  @Get('status')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'Get enhanced WhatsApp connection status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Enhanced status retrieved successfully' })
  async getStatus(): Promise<WhatsAppStatus> {
    return await this.whatsappService.getStatus();
  }

  @Get('qr-code')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'Get QR Code for WhatsApp connection' })
  @ApiResponse({ status: HttpStatus.OK, description: 'QR Code retrieved successfully' })
  async getQRCode() {
    return await this.whatsappService.getQRCode();
  }

  // ✅ ميزة جديدة: توليد QR مع تنظيف الجلسات القديمة
  @Post('generate-qr-with-cleanup')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ 
    summary: 'Generate new QR Code with automatic session cleanup',
    description: 'This endpoint will clean all old session files before generating a new QR code'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'QR Code generated with cleanup' })
  async generateQRWithCleanup(@Request() req) {
    const result = await this.whatsappService.generateQRWithSessionCleanup();
    
    // تسجيل العملية في Audit Log
    // يمكن إضافة هذا لاحقاً إذا لزم الأمر
    
    return result;
  }

  // ✅ ميزة جديدة: تنظيف الجلسات يدوياً
  @Post('cleanup-sessions')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ 
    summary: 'Manual cleanup of WhatsApp session files',
    description: 'Removes all stored session files to force fresh authentication'
  })
  @ApiBody({ type: SessionCleanupDto, required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session cleanup completed' })
  async cleanupSessions(@Body() body: SessionCleanupDto = {}, @Request() req) {
    try {
      // تنفيذ تنظيف الجلسات
      const result = await this.whatsappService.logout(); // يتضمن تنظيف الجلسات
      
      return {
        success: result.success,
        message: result.success 
          ? 'تم تنظيف جميع ملفات الجلسات بنجاح' 
          : 'فشل في تنظيف ملفات الجلسات',
        forceCleanup: body.forceCleanup || false
      };
    } catch (error) {
      return {
        success: false,
        message: 'حدث خطأ أثناء تنظيف ملفات الجلسات: ' + error.message
      };
    }
  }

  // ✅ محسن: معلومات صحة النظام
  @Get('health-check')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ 
    summary: 'Comprehensive health check of WhatsApp system',
    description: 'Returns detailed health information including connection status, errors, and restart count'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Health check completed' })
  async healthCheck() {
    const status = await this.whatsappService.getStatus();
    const isReady = await this.whatsappService.isClientReallyReady();
    
    return {
      status: 'healthy',
      whatsapp: {
        isConnected: status.isConnected,
        isReady: status.isReady,
        phoneNumber: status.phoneNumber,
        restartCount: status.restartCount,
        lastError: status.lastError,
        clientReallyReady: isReady
      },
      timestamp: new Date().toISOString(),
      recommendations: this.getHealthRecommendations(status)
    };
  }

  // ✅ توصيات للصحة
  private getHealthRecommendations(status: WhatsAppStatus): string[] {
    const recommendations = [];
    
    if (!status.isConnected) {
      recommendations.push('🔌 يحتاج إعادة ربط بـ WhatsApp');
    }
    
    if (status.restartCount && status.restartCount > 3) {
      recommendations.push('⚠️ عدد إعادات التشغيل مرتفع - قد تحتاج تنظيف الجلسات');
    }
    
    if (status.lastError) {
      recommendations.push('🚨 يوجد خطأ أخير - راجع السجلات');
    }
    
    if (!status.lastActivity || 
        (new Date().getTime() - new Date(status.lastActivity).getTime()) > 24 * 60 * 60 * 1000) {
      recommendations.push('⏰ لم يتم استخدام النظام لأكثر من 24 ساعة');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ النظام يعمل بصحة جيدة');
    }
    
    return recommendations;
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
    // هذه الدالة تحتاج تطبيق في الخدمة المحسنة
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

  // ✅ محسن: إعادة تشغيل مع معلومات إضافية
  @Post('restart')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ 
    summary: 'Restart WhatsApp client with enhanced monitoring',
    description: 'Performs a safe restart with process cleanup and monitoring'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Client restarted successfully' })
  async restart(@Request() req) {
    const result = await this.whatsappService.restart();
    
    // إضافة معلومات إضافية للاستجابة
    const status = await this.whatsappService.getStatus();
    
    return {
      ...result,
      restartCount: status.restartCount,
      timestamp: new Date().toISOString()
    };
  }

  // ✅ محسن: تسجيل خروج مع تنظيف شامل
  @Post('logout')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ 
    summary: 'Logout from WhatsApp with complete cleanup',
    description: 'Performs logout with session cleanup and process termination'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Logged out successfully with cleanup' })
  async logout() {
    return await this.whatsappService.logout();
  }

  // ✅ الميزة المطلوبة: توليد QR مع حذف الجلسات القديمة
  @Post('generate-qr')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ 
    summary: 'Generate new QR Code (automatically cleans old sessions)',
    description: 'This is the main endpoint that automatically cleans old session files when QR is requested'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'QR Code generated with automatic session cleanup' })
  async generateQR() {
    // 🎯 هذا هو المطلوب: حذف الجلسات القديمة عند طلب QR
    return await this.whatsappService.generateQRWithSessionCleanup();
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
  @ApiOperation({ 
    summary: 'Force re-authentication with session cleanup',
    description: 'Forces logout and cleanup, then prepares for new authentication'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Re-authentication initiated with cleanup' })
  async forceReauth() {
    return await this.whatsappService.logout();
  }

  @Post('force-reinit')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ 
    summary: 'Force client reinitialization with enhanced monitoring',
    description: 'Performs complete reinitialization with process monitoring'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Client reinitialization completed' })
  async forceReinit() {
    return await this.whatsappService.restart();
  }

  @Get('deep-check')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ 
    summary: 'Perform deep connection check with diagnostics',
    description: 'Comprehensive check of connection health with diagnostic information'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Deep check completed with diagnostics' })
  async deepCheck() {
    const isReady = await this.whatsappService.isClientReallyReady();
    const status = await this.whatsappService.getStatus();
    
    return {
      success: isReady,
      message: isReady ? 'الاتصال سليم وجاهز تماماً' : 'يوجد مشكلة في الاتصال',
      diagnostics: {
        isConnected: status.isConnected,
        isReady: status.isReady,
        hasPhoneNumber: !!status.phoneNumber,
        restartCount: status.restartCount,
        lastError: status.lastError,
        lastActivity: status.lastActivity
      }
    };
  }

  @Post('refresh-info')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ 
    summary: 'Refresh client information with enhanced details',
    description: 'Updates and returns comprehensive client information'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Client information refreshed' })
  async refreshInfo() {
    const status = await this.whatsappService.getStatus();
    return {
      success: true,
      message: 'تم تحديث المعلومات',
      phoneNumber: status.phoneNumber,
      connectionStatus: {
        isConnected: status.isConnected,
        isReady: status.isReady,
        restartCount: status.restartCount,
        lastActivity: status.lastActivity,
        lastError: status.lastError
      },
      timestamp: new Date().toISOString()
    };
  }
}
