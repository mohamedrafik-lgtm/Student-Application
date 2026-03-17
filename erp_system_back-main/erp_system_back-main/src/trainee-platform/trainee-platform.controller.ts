import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { TraineePaymentStatusService } from './trainee-payment-status.service';
import { TraineeJwtAuthGuard } from '../trainee-auth/guards/trainee-jwt-auth.guard';
import { TraineePlatformService } from './trainee-platform.service';
import {
  UpdateTraineeAccountDto,
  TraineeAccountQueryDto,
  ResetTraineePasswordDto,
  TraineePlatformStatsQueryDto,
} from './dto/trainee-platform.dto';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('منصة المتدربين')
@ApiBearerAuth()
@Controller('trainee-platform')
@SkipThrottle() // تخطي Rate Limiting لمنصة الطلاب
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TraineePlatformController {
  constructor(
    private readonly traineePlatformService: TraineePlatformService,
    private readonly paymentStatusService: TraineePaymentStatusService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  @Get('accounts')
  @RequirePermission('dashboard.trainee-platform.accounts', 'view')
  @ApiOperation({ summary: 'جلب قائمة حسابات المتدربين' })
  @ApiResponse({ status: 200, description: 'تم جلب قائمة حسابات المتدربين بنجاح' })
  async getTraineeAccounts(@Query() query: TraineeAccountQueryDto, @Req() req: any) {
    // تطبيق فلتر البرامج المسموحة
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, query.programId ? +query.programId : undefined);
    if (programFilter.programId) (query as any).programId = programFilter.programId;
    return this.traineePlatformService.getTraineeAccounts(query);
  }

  @Post('accounts/:id/reset-password')
  @RequirePermission('dashboard.trainee-platform.accounts', 'reset-password')
  @ApiOperation({ summary: 'إعادة تعيين كلمة مرور متدرب' })
  @ApiResponse({ status: 200, description: 'تم إعادة تعيين كلمة المرور بنجاح' })
  @ApiResponse({ status: 404, description: 'حساب المتدرب غير موجود' })
  @HttpCode(HttpStatus.OK)
  async resetTraineePassword(
    @Param('id') id: string,
    @Body() resetData: ResetTraineePasswordDto,
  ) {
    return this.traineePlatformService.resetTraineePassword(id, resetData);
  }

  @Patch('accounts/:id/toggle-status')
  @RequirePermission('dashboard.trainee-platform.accounts', 'activate')
  @ApiOperation({ summary: 'تفعيل أو تعطيل حساب متدرب' })
  @ApiResponse({ status: 200, description: 'تم تغيير حالة حساب المتدرب بنجاح' })
  @ApiResponse({ status: 404, description: 'حساب المتدرب غير موجود' })
  @HttpCode(HttpStatus.OK)
  async toggleAccountStatus(@Param('id') id: string) {
    return this.traineePlatformService.toggleTraineeAccountStatus(id);
  }

  @Post('accounts/:id/send-credentials')
  @RequirePermission('dashboard.trainee-platform.accounts', 'view')
  @ApiOperation({ summary: 'إرسال بيانات تسجيل الدخول للمتدرب عبر الواتساب' })
  @ApiResponse({ status: 200, description: 'تم إرسال البيانات بنجاح' })
  @ApiResponse({ status: 400, description: 'خطأ في إرسال البيانات' })
  @ApiResponse({ status: 404, description: 'حساب المتدرب غير موجود' })
  @HttpCode(HttpStatus.OK)
  async sendPlatformCredentials(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.traineePlatformService.sendPlatformCredentials(id, userId);
  }

  @Get('accounts/:id/password')
  @RequirePermission('dashboard.trainee-platform.accounts', 'view')
  @ApiOperation({ summary: 'جلب كلمة مرور حساب متدرب' })
  @ApiResponse({ status: 200, description: 'تم جلب كلمة المرور بنجاح' })
  @ApiResponse({ status: 404, description: 'حساب المتدرب غير موجود' })
  async getTraineePassword(@Param('id') id: string) {
    return this.traineePlatformService.getTraineePassword(id);
  }

  @Get('accounts/:id')
  @RequirePermission('dashboard.trainee-platform.accounts', 'view')
  @ApiOperation({ summary: 'جلب تفاصيل حساب متدرب' })
  @ApiResponse({ status: 200, description: 'تم جلب تفاصيل حساب المتدرب بنجاح' })
  @ApiResponse({ status: 404, description: 'حساب المتدرب غير موجود' })
  async getTraineeAccountById(@Param('id') id: string) {
    return this.traineePlatformService.getTraineeAccountById(id);
  }

  @Put('accounts/:id')
  @RequirePermission('dashboard.trainee-platform.accounts', 'edit')
  @ApiOperation({ summary: 'تحديث حساب متدرب' })
  @ApiResponse({ status: 200, description: 'تم تحديث حساب المتدرب بنجاح' })
  @ApiResponse({ status: 404, description: 'حساب المتدرب غير موجود' })
  async updateTraineeAccount(
    @Param('id') id: string,
    @Body() updateData: UpdateTraineeAccountDto,
  ) {
    return this.traineePlatformService.updateTraineeAccount(id, updateData);
  }


  @Get('stats')
  @RequirePermission('dashboard.trainee-platform.stats', 'view')
  @ApiOperation({ summary: 'جلب إحصائيات منصة المتدربين' })
  @ApiResponse({ status: 200, description: 'تم جلب إحصائيات منصة المتدربين بنجاح' })
  async getTraineePlatformStats(@Query() query: TraineePlatformStatsQueryDto, @Req() req: any) {
    // تطبيق فلتر البرامج المسموحة
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, query.programId ? +query.programId : undefined);
    if (programFilter.programId) (query as any).programId = programFilter.programId;
    return this.traineePlatformService.getTraineePlatformStats(query);
  }

  @Get('recent-activity')
  @RequirePermission('dashboard.trainee-platform', 'view')
  @ApiOperation({ summary: 'جلب آخر نشاط تسجيل دخول للمتدربين' })
  @ApiResponse({ status: 200, description: 'تم جلب آخر نشاط تسجيل الدخول بنجاح' })
  async getRecentLoginActivity(@Query('limit') limit?: number) {
    return this.traineePlatformService.getRecentLoginActivity(limit);
  }

  @Post('expire-sessions')
  @RequirePermission('dashboard.trainee-platform', 'view')
  @ApiOperation({ summary: 'إنهاء الجلسات المنتهية الصلاحية وإعادة حساب المتوسطات' })
  @ApiResponse({ status: 200, description: 'تم إنهاء الجلسات المنتهية الصلاحية' })
  async expireInactiveSessions() {
    return this.traineePlatformService.expireInactiveSessions();
  }

  @Get('debug-sessions')
  @RequirePermission('dashboard.trainee-platform', 'view')
  @ApiOperation({ summary: 'فحص حالة الجلسات (للتشخيص)' })
  @ApiResponse({ status: 200, description: 'معلومات تشخيصية عن الجلسات' })
  async debugSessions() {
    return this.traineePlatformService.debugSessions();
  }

  /**
   * ==========================================
   * API للمتدربين - فحص حالة الدفع
   * ==========================================
   */

  @Get('my-payment-status')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiOperation({ summary: 'فحص حالة الدفع للمتدرب الحالي' })
  @ApiResponse({
    status: 200,
    description: 'تم فحص حالة الدفع بنجاح',
    schema: {
      properties: {
        status: { type: 'string', enum: ['ACTIVE', 'PAYMENT_DUE', 'BLOCKED'] },
        message: { type: 'string' },
        canAccessPlatform: { type: 'boolean' },
        canAccessQuizzes: { type: 'boolean' },
        canAccessAttendance: { type: 'boolean' },
      }
    }
  })
  async getMyPaymentStatus(@Req() req: any) {
    const traineeId = req.user.traineeId;
    console.log(`🔍 [API] فحص حالة الدفع للمتدرب ${traineeId}`);
    
    return this.paymentStatusService.checkTraineePaymentStatus(traineeId);
  }

  @Get('access-check')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiOperation({ summary: 'فحص إمكانية الوصول للمنصة والميزات' })
  @ApiResponse({
    status: 200,
    description: 'تم فحص إمكانية الوصول بنجاح',
    schema: {
      properties: {
        canAccess: { type: 'boolean' },
        blockReason: { type: 'string' },
        paymentInfo: { type: 'object' },
        blockInfo: { type: 'object' }
      }
    }
  })
  async checkPlatformAccess(@Req() req: any) {
    const traineeId = req.user.traineeId;
    console.log(`🔐 [API] فحص الوصول للمتدرب ${traineeId}`);
    
    const status = await this.paymentStatusService.checkTraineePaymentStatus(traineeId);
    
    return {
      canAccess: status.canAccessPlatform,
      blockReason: status.blockReason,
      paymentInfo: status.status === 'PAYMENT_DUE' ? {
        upcomingPayments: status.upcomingPayments,
        overduePayments: status.overduePayments,
      } : null,
      blockInfo: status.status === 'BLOCKED' ? {
        blockReason: status.blockReason, // سبب الحجب
        message: status.message, // رسالة إضافية (مثل موعد انتهاء الفصل)
        overduePayments: status.overduePayments,
        blockedFeatures: status.blockedFeatures,
      } : null,
    };
  }

  @Get('feature-access/:feature')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiOperation({ summary: 'فحص إمكانية الوصول لميزة معينة' })
  @ApiResponse({ status: 200, description: 'تم فحص الميزة بنجاح' })
  async checkFeatureAccess(
    @Req() req: any,
    @Param('feature') feature: string,
  ) {
    const traineeId = req.user.traineeId;
    
    // تحويل النص للـ enum
    const featureEnum = feature.toUpperCase() as any;
    
    const canAccess = await this.paymentStatusService.canAccessFeature(traineeId, featureEnum);
    
    return {
      feature,
      canAccess,
      message: canAccess
        ? 'الوصول متاح'
        : 'الوصول محجوب بسبب تأخر في سداد الرسوم',
    };
  }

  @Get('overdue-summary')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiOperation({ summary: 'ملخص سريع للمدفوعات المتأخرة' })
  @ApiResponse({ status: 200, description: 'تم جلب الملخص بنجاح' })
  async getOverdueSummary(@Req() req: any) {
    const traineeId = req.user.traineeId;
    
    return this.paymentStatusService.getOverduePaymentsSummary(traineeId);
  }
}
