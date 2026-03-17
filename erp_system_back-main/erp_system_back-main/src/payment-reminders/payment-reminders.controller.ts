import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PaymentRemindersService } from './payment-reminders.service';
import { PaymentRemindersSchedulerService } from './payment-reminders-scheduler.service';
import { CreateReminderTemplateDto } from './dto/create-reminder-template.dto';
import { UpdateReminderTemplateDto } from './dto/update-reminder-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('payment-reminders')
@ApiBearerAuth()
@Controller('payment-reminders')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PaymentRemindersController {
  constructor(
    private readonly remindersService: PaymentRemindersService,
    private readonly schedulerService: PaymentRemindersSchedulerService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  @Post()
  @RequirePermission('dashboard.automation.payment-reminders', 'manage')
  @ApiOperation({ summary: 'إنشاء رسالة تذكيرية جديدة' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'تم إنشاء الرسالة بنجاح' })
  async create(@Body() dto: CreateReminderTemplateDto, @Request() req) {
    const userId = req.user?.id || req.user?.userId || 'system';
    console.log('Create reminder - User ID:', userId);
    const template = await this.remindersService.create(dto, userId);
    return {
      success: true,
      message: 'تم إنشاء الرسالة التذكيرية بنجاح',
      data: template,
    };
  }

  @Get()
  @RequirePermission('dashboard.automation.payment-reminders', 'view')
  @ApiOperation({ summary: 'جلب جميع الرسائل التذكيرية' })
  @ApiQuery({ name: 'feeId', required: false, description: 'فلترة حسب الرسم' })
  @ApiQuery({ name: 'active', required: false, description: 'فلترة حسب الحالة (true/false)' })
  @ApiQuery({ name: 'programId', required: false, description: 'فلترة حسب البرنامج' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب الرسائل بنجاح' })
  async findAll(
    @Query('feeId') feeId?: string,
    @Query('active') active?: string,
    @Query('programId') programId?: string,
    @Request() req?,
  ) {
    const requestedProgramId = programId ? parseInt(programId) : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req?.user?.userId, requestedProgramId);
    
    const filters = {
      feeId: feeId ? parseInt(feeId) : undefined,
      isActive: active === 'true' ? true : active === 'false' ? false : undefined,
      programId: programFilter.programId as number | undefined,
    };

    const templates = await this.remindersService.findAll(filters);
    return {
      success: true,
      data: templates,
    };
  }

  @Get('stats')
  @RequirePermission('dashboard.automation.payment-reminders', 'view')
  @ApiOperation({ summary: 'الحصول على إحصائيات الرسائل التذكيرية' })
  @ApiQuery({ name: 'feeId', required: false })
  @ApiQuery({ name: 'programId', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب الإحصائيات بنجاح' })
  async getStats(
    @Query('feeId') feeId?: string,
    @Query('programId') programId?: string,
    @Request() req?,
  ) {
    const requestedProgramId = programId ? parseInt(programId) : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req?.user?.userId, requestedProgramId);
    
    const filters = {
      feeId: feeId ? parseInt(feeId) : undefined,
      programId: programFilter.programId as number | undefined,
    };

    const stats = await this.remindersService.getStats(filters);
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  @RequirePermission('dashboard.automation.payment-reminders', 'view')
  @ApiOperation({ summary: 'جلب رسالة تذكيرية محددة' })
  @ApiParam({ name: 'id', description: 'معرف الرسالة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب الرسالة بنجاح' })
  async findOne(@Param('id') id: string) {
    const template = await this.remindersService.findOne(id);
    return {
      success: true,
      data: template,
    };
  }

  @Put(':id')
  @RequirePermission('dashboard.automation.payment-reminders', 'manage')
  @ApiOperation({ summary: 'تحديث رسالة تذكيرية' })
  @ApiParam({ name: 'id', description: 'معرف الرسالة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم تحديث الرسالة بنجاح' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReminderTemplateDto,
    @Request() req,
  ) {
    const userId = req.user?.id || req.user?.userId || 'system';
    const template = await this.remindersService.update(id, dto, userId);
    return {
      success: true,
      message: 'تم تحديث الرسالة بنجاح',
      data: template,
    };
  }

  @Delete(':id')
  @RequirePermission('dashboard.automation.payment-reminders', 'manage')
  @ApiOperation({ summary: 'حذف رسالة تذكيرية' })
  @ApiParam({ name: 'id', description: 'معرف الرسالة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم حذف الرسالة بنجاح' })
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?.userId || 'system';
    const result = await this.remindersService.remove(id, userId);
    return {
      success: true,
      ...result,
    };
  }

  @Get(':id/stats')
  @RequirePermission('dashboard.automation.payment-reminders', 'view')
  @ApiOperation({ summary: 'إحصائيات إرسال رسالة محددة' })
  @ApiParam({ name: 'id', description: 'معرف الرسالة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب الإحصائيات بنجاح' })
  async getDeliveryStats(@Param('id') id: string) {
    const stats = await this.remindersService.getDeliveryStats(id);
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id/deliveries')
  @RequirePermission('dashboard.automation.payment-reminders', 'view')
  @ApiOperation({ summary: 'جلب سجلات إرسال رسالة محددة' })
  @ApiParam({ name: 'id', description: 'معرف الرسالة' })
  @ApiQuery({ name: 'status', required: false, description: 'فلترة حسب الحالة' })
  @ApiQuery({ name: 'page', required: false, description: 'رقم الصفحة' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد العناصر في الصفحة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب السجلات بنجاح' })
  async getDeliveries(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    const result = await this.remindersService.getDeliveries(id, filters);
    return {
      success: true,
      ...result,
    };
  }

  @Post(':id/trigger')
  @RequirePermission('dashboard.automation.payment-reminders', 'manage')
  @ApiOperation({ summary: 'تشغيل يدوي لرسالة تذكيرية' })
  @ApiParam({ name: 'id', description: 'معرف الرسالة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم التشغيل بنجاح' })
  async triggerManually(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?.userId || 'system';
    const result = await this.schedulerService.triggerManually(id, userId);
    return result;
  }

  @Post(':id/test')
  @RequirePermission('dashboard.automation.payment-reminders', 'manage')
  @ApiOperation({ summary: 'إرسال تجريبي لمتدرب واحد' })
  @ApiParam({ name: 'id', description: 'معرف الرسالة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم الإرسال التجريبي' })
  async sendTest(
    @Param('id') id: string,
    @Body('traineeId') traineeId: number,
    @Request() req,
  ) {
    const userId = req.user?.id || req.user?.userId || 'system';
    const result = await this.schedulerService.sendTestReminder(id, traineeId, userId);
    return result;
  }

  @Post(':id/retry-failed')
  @RequirePermission('dashboard.automation.payment-reminders', 'manage')
  @ApiOperation({ summary: 'إعادة محاولة الرسائل الفاشلة' })
  @ApiParam({ name: 'id', description: 'معرف الرسالة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تمت إعادة الجدولة' })
  async retryFailed(@Param('id') id: string) {
    const result = await this.schedulerService.retryFailedDeliveries(id);
    return {
      success: true,
      ...result,
    };
  }

  @Get('fee/:feeId/reminders')
  @RequirePermission('dashboard.automation.payment-reminders', 'view')
  @ApiOperation({ summary: 'جلب جميع رسائل رسم محدد' })
  @ApiParam({ name: 'feeId', description: 'معرف الرسم' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب الرسائل بنجاح' })
  async findByFee(@Param('feeId') feeId: string) {
    const templates = await this.remindersService.findByFee(parseInt(feeId));
    return {
      success: true,
      data: templates,
    };
  }
}