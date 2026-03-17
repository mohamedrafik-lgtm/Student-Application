import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SystemHealthResponseDto } from './dto/system-health.dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'الحصول على إحصائيات الداشبورد الرئيسية' })
  @ApiResponse({ status: 200, description: 'إحصائيات الداشبورد' })
  async getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }

  @Get('charts')
  @ApiOperation({ summary: 'الحصول على بيانات الرسوم البيانية' })
  @ApiResponse({ status: 200, description: 'بيانات الرسوم البيانية' })
  async getDashboardCharts() {
    return this.dashboardService.getDashboardCharts();
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
  async getComprehensiveDashboard() {
    return this.dashboardService.getComprehensiveDashboard();
  }

  @Get('system-health')
  @ApiOperation({ summary: 'الحصول على حالة النظام التقنية' })
  @ApiResponse({ status: 200, description: 'حالة النظام', type: SystemHealthResponseDto })
  async getSystemHealth() {
    return this.dashboardService.getSystemHealth();
  }
}
