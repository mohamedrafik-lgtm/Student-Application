import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { StaffAttendanceService } from './staff-attendance.service';
import { CheckInDto, CheckOutDto } from './dto/check-in.dto';
import { ManualRecordDto, UpdateLogDto } from './dto/manual-record.dto';
import { UpdateSettingsDto } from './dto/settings.dto';
import { EnrollStaffDto, BulkEnrollStaffDto, UpdateEnrollmentDto } from './dto/enrollment.dto';
import { CreateLeaveRequestDto, ReviewLeaveRequestDto } from './dto/leave-request.dto';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/holiday.dto';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';

@Controller('staff-attendance')
@UseGuards(JwtAuthGuard)
export class StaffAttendanceController {
  constructor(private readonly service: StaffAttendanceService) {}

  // =============== الإعدادات ===============

  @Get('settings')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.settings', 'view')
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.settings', 'manage')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(dto);
  }

  // =============== التسجيل ===============

  @Get('enrollments')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.enrollments', 'view')
  getEnrollments(@Query('includeInactive') includeInactive?: string) {
    return this.service.getEnrollments(includeInactive === 'true');
  }

  @Post('enrollments')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.enrollments', 'manage')
  enrollStaff(@Body() dto: EnrollStaffDto, @Request() req: any) {
    return this.service.enrollStaff(dto, req.user.userId);
  }

  @Post('enrollments/bulk')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.enrollments', 'manage')
  bulkEnrollStaff(@Body() dto: BulkEnrollStaffDto, @Request() req: any) {
    return this.service.bulkEnrollStaff(dto, req.user.userId);
  }

  @Delete('enrollments/:userId')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.enrollments', 'manage')
  unenrollStaff(@Param('userId') userId: string) {
    return this.service.unenrollStaff(userId);
  }

  @Patch('enrollments/:userId')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.enrollments', 'manage')
  updateEnrollment(@Param('userId') userId: string, @Body() dto: UpdateEnrollmentDto) {
    return this.service.updateEnrollment(userId, dto);
  }

  // =============== الحضور الشخصي ===============

  @Post('check-in')
  checkIn(@Body() dto: CheckInDto, @Request() req: any) {
    return this.service.checkIn(req.user.userId, dto);
  }

  @Post('check-out')
  checkOut(@Body() dto: CheckOutDto, @Request() req: any) {
    return this.service.checkOut(req.user.userId, dto);
  }

  @Get('my-status')
  getMyStatus(@Request() req: any) {
    return this.service.getMyStatus(req.user.userId);
  }

  @Get('my-logs')
  getMyLogs(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.service.getMyLogs(req.user.userId, Number(page) || 1, Number(limit) || 30);
  }

  // =============== إدارة السجلات ===============

  @Get('today')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance', 'view')
  getTodayAttendance() {
    return this.service.getTodayAttendance();
  }

  @Get('logs')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance', 'view')
  getAllLogs(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getAllLogs({
      userId,
      startDate,
      endDate,
      status,
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    });
  }

  @Get('logs/user/:userId')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance', 'view')
  getUserLogs(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getUserLogs(userId, startDate, endDate);
  }

  @Post('manual-record')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance', 'manage')
  manualRecord(@Body() dto: ManualRecordDto, @Request() req: any) {
    return this.service.manualRecord(dto, req.user.userId);
  }

  @Patch('logs/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance', 'manage')
  updateLog(@Param('id') id: string, @Body() dto: UpdateLogDto) {
    return this.service.updateLog(id, dto);
  }

  // =============== أذونات الغياب ===============

  @Get('leaves')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.leaves', 'view')
  getLeaveRequests(@Query('userId') userId?: string, @Query('status') status?: string) {
    return this.service.getLeaveRequests({ userId, status });
  }

  @Get('my-leaves')
  getMyLeaves(@Request() req: any, @Query('status') status?: string) {
    return this.service.getMyLeaves(req.user.userId, status);
  }

  @Post('leaves')
  createLeaveRequest(@Body() dto: CreateLeaveRequestDto, @Request() req: any) {
    return this.service.createLeaveRequest(req.user.userId, dto);
  }

  @Patch('leaves/:id/review')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.leaves', 'manage')
  reviewLeaveRequest(@Param('id') id: string, @Body() dto: ReviewLeaveRequestDto, @Request() req: any) {
    return this.service.reviewLeaveRequest(id, req.user.userId, dto);
  }

  // =============== العطلات ===============

  @Get('holidays')
  getHolidays() {
    return this.service.getHolidays();
  }

  @Post('holidays')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.holidays', 'manage')
  createHoliday(@Body() dto: CreateHolidayDto, @Request() req: any) {
    return this.service.createHoliday(dto, req.user.userId);
  }

  @Put('holidays/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.holidays', 'manage')
  updateHoliday(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.service.updateHoliday(id, dto);
  }

  @Delete('holidays/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.holidays', 'manage')
  deleteHoliday(@Param('id') id: string) {
    return this.service.deleteHoliday(id);
  }

  // =============== مناطق الحضور المسموحة ===============

  @Get('zones')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.settings', 'view')
  getZones() {
    return this.service.getZones();
  }

  @Post('zones')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.settings', 'manage')
  createZone(@Body() dto: CreateZoneDto) {
    return this.service.createZone(dto);
  }

  @Put('zones/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.settings', 'manage')
  updateZone(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.service.updateZone(id, dto);
  }

  @Delete('zones/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance.settings', 'manage')
  deleteZone(@Param('id') id: string) {
    return this.service.deleteZone(id);
  }

  // =============== الداشبورد ===============

  @Get('dashboard')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance', 'view')
  getDashboardStats() {
    return this.service.getDashboardStats();
  }

  @Get('dashboard/user/:userId')
  @UseGuards(PermissionGuard)
  @RequirePermission('staff-attendance', 'view')
  getUserDashboard(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getUserLogs(userId, startDate, endDate);
  }
}
