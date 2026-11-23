import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SystemHealthResponseDto } from './dto/system-health.dto';
import { UserDistributionAccessService } from '../users/user-distribution-access.service';
import { UserProgramAccessService } from '../users/user-program-access.service';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequireMultiple } from '../permissions/decorators/require-permission.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly userDistributionAccessService: UserDistributionAccessService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'الحصول على إحصائيات الداشبورد الرئيسية' })
  @ApiResponse({ status: 200, description: 'إحصائيات الداشبورد' })
  async getDashboardStats(@Req() req: any) {
    const restrictedTraineeIds = await this.userDistributionAccessService.getRestrictedTraineeIds(req.user.userId);
    return this.dashboardService.getDashboardStats(restrictedTraineeIds ?? undefined);
  }

  @Get('charts')
  @ApiOperation({ summary: 'الحصول على بيانات الرسوم البيانية' })
  @ApiResponse({ status: 200, description: 'بيانات الرسوم البيانية' })
  async getDashboardCharts(@Req() req: any) {
    const restrictedTraineeIds = await this.userDistributionAccessService.getRestrictedTraineeIds(req.user.userId);
    return this.dashboardService.getDashboardCharts(restrictedTraineeIds ?? undefined);
  }

  @Get('activities')
  @ApiOperation({ summary: 'الحصول على آخر الأنشطة' })
  @ApiResponse({ status: 200, description: 'آخر الأنشطة' })
  async getDashboardActivities() {
    return this.dashboardService.getDashboardActivities();
  }

  @Get('comprehensive')
  @ApiOperation({ summary: 'الحصول على بيانات الداشبورد الشاملة' })
  @ApiResponse({ status: 200, description: 'بيانات شاملة للداشبورد' })
  async getComprehensiveDashboard(@Req() req: any) {
    const restrictedTraineeIds = await this.userDistributionAccessService.getRestrictedTraineeIds(req.user.userId);
    return this.dashboardService.getComprehensiveDashboard(restrictedTraineeIds ?? undefined);
  }

  @Get('fee-repayment-stats')
  @UseGuards(PermissionGuard)
  @RequireMultiple({
    permissions: [
      { resource: 'dashboard.statistics', action: 'view' },
      { resource: 'dashboard.financial', action: 'view' },
    ],
    operator: 'AND',
  })
  @ApiOperation({ summary: 'إحصائيات سداد رسوم المتدربين حسب البرنامج والرسم' })
  async getProgramFeeRepaymentStats(@Req() req: any) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.dashboardService.getProgramFeeRepaymentStats(allowedProgramIds.length ? allowedProgramIds : undefined);
  }

  @Get('system-health')
  @ApiOperation({ summary: 'الحصول على حالة النظام التقنية' })
  @ApiResponse({ status: 200, description: 'حالة النظام', type: SystemHealthResponseDto })
  async getSystemHealth() {
    return this.dashboardService.getSystemHealth();
  }

  // ============ المتدربون الجدد حسب اليوم ============

  @Get('new-trainees/days')
  @UseGuards(PermissionGuard)
  @RequireMultiple({
    permissions: [
      { resource: 'dashboard.statistics', action: 'view' },
      { resource: 'marketing.applications', action: 'view' },
    ],
    operator: 'AND',
  })
  @ApiOperation({ summary: 'عدد المتدربين الجدد لكل يوم في شهر' })
  @ApiQuery({ name: 'month', required: false, description: 'الشهر بصيغة YYYY-MM' })
  async getNewTraineesDays(@Req() req: any, @Query('month') month?: string) {
    const restrictedTraineeIds = await this.userDistributionAccessService.getRestrictedTraineeIds(req.user.userId);
    return this.dashboardService.getNewTraineesDays(month, restrictedTraineeIds ?? undefined);
  }

  @Get('new-trainees')
  @UseGuards(PermissionGuard)
  @RequireMultiple({
    permissions: [
      { resource: 'dashboard.statistics', action: 'view' },
      { resource: 'marketing.applications', action: 'view' },
    ],
    operator: 'AND',
  })
  @ApiOperation({ summary: 'قائمة المتدربين الجدد في يوم محدد مع القيم المالية' })
  @ApiQuery({ name: 'date', required: false, description: 'اليوم بصيغة YYYY-MM-DD' })
  async getNewTrainees(@Req() req: any, @Query('date') date?: string) {
    const restrictedTraineeIds = await this.userDistributionAccessService.getRestrictedTraineeIds(req.user.userId);
    return this.dashboardService.getNewTraineesByDate(date, restrictedTraineeIds ?? undefined);
  }
}
