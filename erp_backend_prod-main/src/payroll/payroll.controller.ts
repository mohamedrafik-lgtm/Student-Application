import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { PayrollService } from './payroll.service';

@ApiTags('الرواتب')
@ApiBearerAuth()
@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('settings')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'view')
  getSettings() { return this.payrollService.getSettings(); }

  @Put('settings')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'manage')
  updateSettings(@Body() body: { advanceLimitPercent: number }) { return this.payrollService.updateSettings(Number(body.advanceLimitPercent)); }

  @Get('profiles')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'view')
  listProfiles() { return this.payrollService.listProfiles(); }

  @Post('profiles')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'manage')
  saveProfile(@Body() body: any, @Req() req: any) { return this.payrollService.saveProfile(body, req.user.userId); }

  @Patch('profiles/:id/status')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'manage')
  setProfileActive(@Param('id') id: string, @Body() body: { isActive: boolean }) { return this.payrollService.setProfileActive(id, body.isActive === true); }

  @Get('periods')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'view')
  listPeriods() { return this.payrollService.listPeriods(); }

  @Post('periods/generate')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'manage')
  generatePeriod(@Body() body: { year: number; month: number }, @Req() req: any) { return this.payrollService.generatePeriod(Number(body.year), Number(body.month), req.user.userId); }

  @Get('periods/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'view')
  getPeriod(@Param('id') id: string) { return this.payrollService.getPeriod(id); }

  @Post('periods/:id/approve')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'approve')
  approvePeriod(@Param('id') id: string, @Req() req: any) { return this.payrollService.approvePeriod(id, req.user.userId); }

  @Post('periods/:id/approve-slips')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'approve')
  approveSlips(@Param('id') id: string, @Body() body: { slipIds?: string[] }, @Req() req: any) {
    return this.payrollService.approveSlips(id, body?.slipIds, req.user.userId);
  }

  @Post('slips/:id/approve')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'approve')
  approveSlip(@Param('id') id: string, @Req() req: any) {
    return this.payrollService.approveSlip(id, req.user.userId);
  }

  @Post('slips/:id/adjustments')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'manage')
  addAdjustment(@Param('id') id: string, @Body() body: { type: 'ADDITION' | 'DEDUCTION'; amount: number; reason: string }, @Req() req: any) { return this.payrollService.addAdjustment(id, body, req.user.userId); }

  @Patch('slips/:id/kpi')
  @UseGuards(PermissionGuard)
  @RequirePermission('hr.payroll', 'manage')
  setSlipKpi(@Param('id') id: string, @Body() body: { amount: number }) { return this.payrollService.setSlipKpi(id, Number(body.amount)); }

  @Get('finance/periods')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.financial.payroll', 'view')
  listApprovedForPayout() { return this.payrollService.listApprovedForPayout(); }

  @Post('finance/slips/:id/payouts')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.financial.payroll', 'pay')
  payout(@Param('id') id: string, @Body() body: { safeId: string; targetSafeId: string; amount: number; description: string }, @Req() req: any) { return this.payrollService.payout(id, body.safeId, body.targetSafeId, Number(body.amount), body.description, req.user.userId); }

  @Get('my')
  @ApiOperation({ summary: 'مفردات راتب الموظف الحالي' })
  getMySlips(@Req() req: any) { return this.payrollService.getMySlips(req.user.userId); }

  @Get('my/profile')
  @ApiOperation({ summary: 'ملخص الراتب الأساسي للموظف الحالي' })
  getMyPayrollProfile(@Req() req: any) { return this.payrollService.getMyPayrollProfile(req.user.userId); }

  @Get('my/eligibility')
  @ApiOperation({ summary: 'التحقق من ارتباط ملف راتب بحساب الموظف الحالي' })
  getMyPayrollEligibility(@Req() req: any) { return this.payrollService.getMyPayrollEligibility(req.user.userId); }
}
