import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TraineeJwtAuthGuard } from '../trainee-auth/guards/trainee-jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GradeAppealsService } from './grade-appeals.service';
import { CreateGradeAppealDto } from './dto/create-grade-appeal.dto';
import { ReviewGradeAppealDto } from './dto/review-grade-appeal.dto';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('تظلمات الدرجات')
@Controller('grade-appeals')
export class GradeAppealsController {
  constructor(
    private readonly service: GradeAppealsService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  /**
   * ==========================================
   * APIs للمتدربين
   * ==========================================
   */

  @Get('appeals-status')
  @ApiOperation({ summary: 'جلب حالة قبول التظلمات (عام)' })
  async getAppealsStatus() {
    return this.service.getAppealsSettings();
  }

  @Post()
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تقديم تظلم جديد (للمتدربين)' })
  async create(@Request() req, @Body() createDto: CreateGradeAppealDto) {
    const traineeId = req.user.traineeId;
    return this.service.create(traineeId, createDto);
  }

  @Get('my-appeals')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب تظلماتي (للمتدربين)' })
  async getMyAppeals(@Request() req) {
    const traineeId = req.user.traineeId;
    return this.service.findMyAppeals(traineeId);
  }

  @Delete('my-appeals/:id')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إلغاء تظلم (للمتدربين) - فقط إذا لم تتم مراجعة أي مادة' })
  async cancelAppeal(@Param('id') id: string, @Request() req) {
    const traineeId = req.user.traineeId;
    return this.service.cancelAppeal(id, traineeId);
  }

  /**
   * ==========================================
   * APIs للإدارة
   * ==========================================
   */

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب جميع التظلمات (للإدارة)' })
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?,
  ) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req?.user?.userId);
    return this.service.findAll({
      status,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      allowedProgramIds: allowedProgramIds.length > 0 ? allowedProgramIds : undefined,
    });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إحصائيات التظلمات' })
  async getStats(@Request() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.getStats(allowedProgramIds.length > 0 ? allowedProgramIds : undefined);
  }

  @Patch('toggle')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'فتح/إغلاق قبول التظلمات' })
  async toggleAppeals(@Body() body: { accept: boolean }) {
    await this.service.toggleAppealsStatus(body.accept);
    return { success: true, acceptGradeAppeals: body.accept };
  }

  /**
   * ==========================================
   * APIs إعدادات رسوم التظلمات
   * ==========================================
   */

  @Get('fee-config/all')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب جميع إعدادات رسوم التظلمات' })
  async getFeeConfigs() {
    return this.service.getFeeConfigs();
  }

  @Get('fee-config/programs')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب جميع البرامج التدريبية' })
  async getAllPrograms() {
    return this.service.getAllPrograms();
  }

  @Get('fee-config/fees')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب جميع القيود المالية' })
  async getAllFees() {
    return this.service.getAllFees();
  }

  @Put('fee-config/:programId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إنشاء أو تحديث إعدادات رسوم التظلم لبرنامج' })
  async upsertFeeConfig(
    @Param('programId') programId: string,
    @Body() body: { feeId: number },
  ) {
    return this.service.upsertFeeConfig(parseInt(programId), body.feeId);
  }

  @Delete('fee-config/:programId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف إعدادات رسوم التظلم لبرنامج' })
  async deleteFeeConfig(@Param('programId') programId: string) {
    return this.service.deleteFeeConfig(parseInt(programId));
  }

  @Put('subjects/:subjectId/review')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'مراجعة مادة واحدة في التظلم (قبول/رفض)' })
  async reviewSubject(
    @Param('subjectId') subjectId: string,
    @Body() body: { status: 'ACCEPTED' | 'REJECTED'; adminResponse?: string },
    @Request() req,
  ) {
    return this.service.reviewSubject(subjectId, body.status, body.adminResponse, req.user.userId);
  }

  @Put(':id/bulk-reject')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إعادة مراجعة - رفض جميع المواد المعلقة' })
  async bulkReject(@Param('id') id: string, @Request() req) {
    return this.service.bulkRejectAllSubjects(id, req.user.userId);
  }

  @Put(':id/mark-reviewed')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حفظ حالة إعادة المراجعة لجميع مواد التظلم' })
  async markReviewed(@Param('id') id: string, @Request() req) {
    return this.service.markSubjectsReviewed(id, req.user.userId);
  }

  @Get(':id/review-data')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب بيانات المراجعة التفصيلية (اختبارات ورقية + درجات)' })
  async getReviewData(@Param('id') id: string) {
    return this.service.getReviewData(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب تفاصيل تظلم' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/review')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'مراجعة تظلم (قبول/رفض)' })
  async review(
    @Param('id') id: string,
    @Body() reviewDto: ReviewGradeAppealDto,
    @Request() req,
  ) {
    return this.service.review(id, reviewDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.grade-appeals', 'delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف تظلم' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
