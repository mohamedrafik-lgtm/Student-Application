import {
  Body,
  Controller,
  Delete,
  Get,
  ParseIntPipe,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TraineeJwtAuthGuard } from '../trainee-auth/guards/trainee-jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { UserProgramAccessService } from '../users/user-program-access.service';
import { MinistryExamDeclarationsService } from './ministry-exam-declarations.service';
import { SubmitBranchDeclarationDto } from './dto/submit-branch-declaration.dto';
import { SubmitOnlineDeclarationDto } from './dto/submit-online-declaration.dto';
import { ReviewMinistryExamDeclarationDto } from './dto/review-ministry-exam-declaration.dto';
import { ConfirmBranchDeliveryDto } from './dto/confirm-branch-delivery.dto';
import { AdminDeliverMinistryExamDeclarationDto } from './dto/admin-deliver-ministry-exam-declaration.dto';
import { CreateMinistryExamFeeSettingDto } from './dto/create-ministry-exam-fee-setting.dto';
import { UpdateMinistryExamFeeSettingDto } from './dto/update-ministry-exam-fee-setting.dto';

@ApiTags('إقرار دخول اختبار وزارة العمل')
@Controller('ministry-exam-declarations')
export class MinistryExamDeclarationsController {
  constructor(
    private readonly service: MinistryExamDeclarationsService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  /**
   * ==========================================
   * APIs للمتدربين
   * ==========================================
   */

  @Get('my-request')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب حالة إقرار المتدرب الحالي' })
  async getMyRequest(@Request() req) {
    const traineeId = req.user.traineeId;
    return this.service.getMyDeclaration(traineeId);
  }

  @Get('my/submission-policy')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب سياسة إقرار وزارة العمل (فتح/غلق، موعد، سداد) للمتدرب الحالي' })
  async getMySubmissionPolicy(@Request() req) {
    const traineeId = req.user.traineeId;
    return this.service.getMySubmissionPolicy(traineeId);
  }

  @Get('my/public-link')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب رابط طباعة مميز للمتدرب (بدون تسجيل دخول عند الفتح)' })
  async getMyPublicLink(@Request() req) {
    const traineeId = req.user.traineeId;
    return this.service.getMyPublicPrintLink(traineeId);
  }

  @Post('my/branch')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديد التسليم من خلال الفرع' })
  async submitBranch(@Request() req, @Body() dto: SubmitBranchDeclarationDto) {
    const traineeId = req.user.traineeId;
    return this.service.submitBranchDeclaration(traineeId, dto);
  }

  @Post('my/online')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'رفع الإقرار أونلاين' })
  async submitOnline(@Request() req, @Body() dto: SubmitOnlineDeclarationDto) {
    const traineeId = req.user.traineeId;
    return this.service.submitOnlineDeclaration(traineeId, dto);
  }

  @Get('public/:token')
  @ApiOperation({ summary: 'جلب بيانات الإقرار عبر رابط عام بدون تسجيل دخول' })
  async getPublicDeclaration(@Param('token') token: string) {
    return this.service.getPublicDeclarationByToken(token);
  }

  /**
   * ==========================================
   * APIs للإدارة
   * ==========================================
   */

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-declarations', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب جميع إقرارات وزارة العمل (للإدارة)' })
  async findAll(@Query() query: any, @Request() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.findAll({
      ...query,
      allowedProgramIds: allowedProgramIds.length > 0 ? allowedProgramIds : undefined,
    });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-declarations', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إحصائيات إقرارات وزارة العمل' })
  async getStats(@Request() req, @Query('programId') programId?: string) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.getStats(
      allowedProgramIds.length > 0 ? allowedProgramIds : undefined,
      programId ? Number(programId) : undefined,
    );
  }

  @Get('review/trainees')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-declarations-review', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'قائمة مراجعة إقرارات وزارة العمل (كل المتدربين)' })
  async getReviewTrainees(@Query() query: any, @Request() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.findReviewTrainees({
      ...query,
      allowedProgramIds: allowedProgramIds.length > 0 ? allowedProgramIds : undefined,
    });
  }

  @Get('review/stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-declarations-review', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إحصائيات صفحة مراجعة إقرارات وزارة العمل' })
  async getReviewStats(
    @Request() req,
    @Query('search') search?: string,
    @Query('programId') programId?: string,
  ) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.getReviewStats({
      search,
      programId: programId ? Number(programId) : undefined,
      allowedProgramIds: allowedProgramIds.length > 0 ? allowedProgramIds : undefined,
    });
  }

  @Get('fees/configs')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-fees', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب إعدادات رسوم اختبار وزارة العمل' })
  async findFeeSettings(@Request() req, @Query('programId') programId?: string) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.findFeeSettings({
      programId: programId ? Number(programId) : undefined,
      allowedProgramIds: allowedProgramIds.length > 0 ? allowedProgramIds : undefined,
    });
  }

  @Post('fees/configs')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-fees', 'manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إنشاء إعداد رسوم اختبار وزارة العمل لبرنامج' })
  async createFeeSetting(
    @Body() dto: CreateMinistryExamFeeSettingDto,
    @Request() req,
  ) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.createFeeSetting(
      dto,
      req.user.userId,
      allowedProgramIds.length > 0 ? allowedProgramIds : undefined,
    );
  }

  @Put('fees/configs/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-fees', 'manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث إعداد رسوم اختبار وزارة العمل لبرنامج' })
  async updateFeeSetting(
    @Param('id') id: string,
    @Body() dto: UpdateMinistryExamFeeSettingDto,
    @Request() req,
  ) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.updateFeeSetting(
      id,
      dto,
      allowedProgramIds.length > 0 ? allowedProgramIds : undefined,
    );
  }

  @Post('fees/configs/:id/toggle-open')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-fees', 'manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فتح/غلق استقبال طلبات إقرار وزارة العمل لإعداد محدد' })
  async toggleFeeSettingOpen(
    @Param('id') id: string,
    @Body('isRequestsOpen') isRequestsOpen: boolean,
    @Request() req,
  ) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.updateFeeSetting(
      id,
      { isRequestsOpen: isRequestsOpen === true },
      allowedProgramIds.length > 0 ? allowedProgramIds : undefined,
    );
  }

  @Delete('fees/configs/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-fees', 'manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف إعداد رسوم اختبار وزارة العمل' })
  async deleteFeeSetting(@Param('id') id: string, @Request() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.deleteFeeSetting(
      id,
      allowedProgramIds.length > 0 ? allowedProgramIds : undefined,
    );
  }

  @Get('admin/trainee/:traineeId/public-link')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.trainees', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب رابط طباعة الإقرار المميز لمتدرب محدد (من الإدارة)' })
  async getAdminTraineePublicLink(@Param('traineeId', ParseIntPipe) traineeId: number) {
    return this.service.getAdminPublicPrintLinkForTrainee(traineeId);
  }

  @Get('admin/trainee/:traineeId/delivery-status')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.trainees', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'التحقق من إمكانية تسليم إقرار وزارة العمل لمتدرب محدد' })
  async getAdminTraineeDeliveryStatus(@Param('traineeId', ParseIntPipe) traineeId: number) {
    return this.service.getAdminDeliveryStatusForTrainee(traineeId);
  }

  @Post('admin/trainee/:traineeId/deliver')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.trainees', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تسليم إقرار وزارة العمل من الإدارة (ورقي/رقمي مع موافقة تلقائية)' })
  async adminDeliverDeclaration(
    @Param('traineeId', ParseIntPipe) traineeId: number,
    @Body() dto: AdminDeliverMinistryExamDeclarationDto,
    @Request() req,
  ) {
    return this.service.adminDeliverDeclaration(traineeId, dto, req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-declarations', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب تفاصيل إقرار محدد' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/review')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-declarations', 'review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'مراجعة الإقرار الأونلاين (قبول/طلب إعادة رفع)' })
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewMinistryExamDeclarationDto,
    @Request() req,
  ) {
    return this.service.reviewOnlineDeclaration(id, dto, req.user.userId);
  }

  @Put(':id/confirm-branch-delivery')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.ministry-exam-declarations', 'confirm-delivery')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تأكيد استلام إقرار الفرع' })
  async confirmBranchDelivery(
    @Param('id') id: string,
    @Body() dto: ConfirmBranchDeliveryDto,
    @Request() req,
  ) {
    return this.service.confirmBranchDelivery(id, dto, req.user.userId);
  }
}
