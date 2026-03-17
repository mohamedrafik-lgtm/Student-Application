import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MarketingService } from './marketing.service';
import { CreateMarketingEmployeeDto, UpdateMarketingEmployeeDto } from './dto/marketing-employee.dto';
import { CreateMarketingTargetDto, UpdateMarketingTargetDto } from './dto/marketing-target.dto';
import { CreateMarketingApplicationDto, UpdateMarketingApplicationDto } from './dto/marketing-application.dto';
import { UpdateTraineeContactDto } from './dto/update-trainee-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('إدارة التسويق')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  // ==================== موظفي التسويق ====================

  @Post('employees')
  @RequirePermission('marketing.employees', 'create')
  @ApiOperation({ summary: 'إضافة موظف تسويق جديد' })
  @ApiResponse({ status: 201, description: 'تم إضافة الموظف بنجاح' })
  async createEmployee(@Body() createEmployeeDto: CreateMarketingEmployeeDto) {
    return this.marketingService.createEmployee(createEmployeeDto);
  }

  @Get('employees')
  @RequirePermission('marketing.employees', 'view')
  @ApiOperation({ summary: 'عرض جميع موظفي التسويق' })
  @ApiResponse({ status: 200, description: 'تم جلب البيانات بنجاح' })
  async getAllEmployees() {
    return this.marketingService.getAllEmployees();
  }

  @Get('employees/:id')
  @RequirePermission('marketing.employees', 'view')
  @ApiOperation({ summary: 'عرض تفاصيل موظف تسويق' })
  @ApiResponse({ status: 200, description: 'تم جلب البيانات بنجاح' })
  async getEmployeeById(@Param('id', ParseIntPipe) id: number) {
    return this.marketingService.getEmployeeById(id);
  }

  @Put('employees/:id')
  @RequirePermission('marketing.employees', 'edit')
  @ApiOperation({ summary: 'تعديل بيانات موظف تسويق' })
  @ApiResponse({ status: 200, description: 'تم التعديل بنجاح' })
  async updateEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmployeeDto: UpdateMarketingEmployeeDto,
  ) {
    return this.marketingService.updateEmployee(id, updateEmployeeDto);
  }

  @Delete('employees/:id')
  @RequirePermission('marketing.employees', 'delete')
  @ApiOperation({ summary: 'حذف موظف تسويق' })
  @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
  async deleteEmployee(@Param('id', ParseIntPipe) id: number) {
    return this.marketingService.deleteEmployee(id);
  }

  // ==================== أهداف التسويق ====================

  @Post('targets')
  @RequirePermission('marketing.targets', 'create')
  @ApiOperation({ summary: 'تحديد هدف تسويقي' })
  @ApiResponse({ status: 201, description: 'تم تحديد الهدف بنجاح' })
  async setTarget(@Body() createTargetDto: CreateMarketingTargetDto) {
    return this.marketingService.setTarget(createTargetDto);
  }

  @Get('targets')
  @RequirePermission('marketing.targets', 'view')
  @ApiOperation({ summary: 'عرض جميع الأهداف' })
  @ApiResponse({ status: 200, description: 'تم جلب البيانات بنجاح' })
  async getAllTargets(
    @Query('month', ParseIntPipe) month?: number,
    @Query('year', ParseIntPipe) year?: number,
  ) {
    return this.marketingService.getAllTargets(month, year);
  }

  @Get('targets/employee/:employeeId')
  @RequirePermission('marketing.targets', 'view')
  @ApiOperation({ summary: 'عرض أهداف موظف معين' })
  @ApiResponse({ status: 200, description: 'تم جلب البيانات بنجاح' })
  async getTargetsByEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('year', ParseIntPipe) year?: number,
  ) {
    return this.marketingService.getTargetsByEmployee(employeeId, year);
  }

  @Put('targets/:id')
  @RequirePermission('marketing.targets', 'edit')
  @ApiOperation({ summary: 'تعديل هدف تسويقي' })
  @ApiResponse({ status: 200, description: 'تم التعديل بنجاح' })
  async updateTarget(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTargetDto: UpdateMarketingTargetDto,
  ) {
    return this.marketingService.updateTarget(id, updateTargetDto);
  }

  // ==================== إدارة المتدربين والتسويق ====================

  @Get('trainees')
  @RequirePermission('marketing.applications', 'view')
  @ApiOperation({ summary: 'عرض جميع المتدربين مع معلومات التسويق' })
  @ApiResponse({ status: 200, description: 'تم جلب البيانات بنجاح' })
  async getAllTraineesWithMarketing(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('unassigned') unassigned?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    const filters = {
      search: search || undefined,
      status: status || undefined,
      employeeId: employeeId ? parseInt(employeeId, 10) : undefined,
      unassigned: unassigned === 'true',
    };

    return this.marketingService.getAllTraineesWithMarketing(pageNum, limitNum, filters);
  }

  @Put('trainees/:traineeId/assign')
  @RequirePermission('marketing.applications', 'edit')
  @ApiOperation({ summary: 'تعيين متدرب لموظف تسويق' })
  @ApiResponse({ status: 200, description: 'تم التعيين بنجاح' })
  async assignTraineeToMarketingEmployee(
    @Param('traineeId', ParseIntPipe) traineeId: number,
    @Body('marketingEmployeeId') marketingEmployeeId: number | null,
    @Request() req,
  ) {
    return this.marketingService.assignTraineeToMarketingEmployee(traineeId, marketingEmployeeId, req.user?.id);
  }

  @Get('trainees/:traineeId/can-modify-contact/:contactType')
  @RequirePermission('marketing.applications', 'view')
  @ApiOperation({ summary: 'التحقق من إمكانية تعديل التواصل الأول أو الثاني' })
  @ApiResponse({ status: 200, description: 'نتيجة الفحص' })
  async canModifyContact(
    @Param('traineeId', ParseIntPipe) traineeId: number,
    @Param('contactType') contactType: 'FIRST_CONTACT' | 'SECOND_CONTACT',
    @Query('employeeId') employeeId?: string,
  ) {
    const empId = employeeId ? parseInt(employeeId) : undefined;
    const canModify = await this.marketingService.canModifyContact(traineeId, contactType, empId);
    console.log(`🔧 Controller returning for trainee ${traineeId}, ${contactType}:`, canModify);
    
    // إرجاع استجابة واضحة
    return {
      traineeId,
      contactType,
      canModify,
      success: canModify
    };
  }

  @Put('trainees/:traineeId/contact')
  @RequirePermission('marketing.applications', 'edit')
  @ApiOperation({ summary: 'تحديث التواصل الأول والثاني للمتدرب' })
  @ApiResponse({ status: 200, description: 'تم تحديث التواصل بنجاح' })
  async updateTraineeContact(
    @Param('traineeId', ParseIntPipe) traineeId: number,
    @Body() updateContactDto: UpdateTraineeContactDto,
    @Request() req,
  ) {
    return this.marketingService.updateTraineeContact(traineeId, updateContactDto, req.user?.id);
  }

  @Get('employees/:employeeId/trainees')
  @RequirePermission('marketing.applications', 'view')
  @ApiOperation({ summary: 'عرض المتدربين المُعيَّنين لموظف تسويق' })
  @ApiResponse({ status: 200, description: 'تم جلب البيانات بنجاح' })
  async getTraineesByMarketingEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.marketingService.getTraineesByMarketingEmployee(employeeId, pageNum, limitNum);
  }

  // ==================== الإحصائيات ====================

  @Get('stats')
  @RequirePermission('marketing.stats', 'view')
  @ApiOperation({ summary: 'عرض إحصائيات التسويق' })
  @ApiResponse({ status: 200, description: 'تم جلب البيانات بنجاح' })
  async getMarketingStats(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const monthNum = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.marketingService.getMarketingStats(monthNum, yearNum);
  }

  // ==================== التقديمات القديمة (للحفاظ على التوافق) ====================

  @Get('applications')
  @RequirePermission('marketing.applications', 'view')
  @ApiOperation({ summary: 'عرض جميع المتدربين (مسار متوافق)' })
  @ApiResponse({ status: 200, description: 'تم جلب البيانات بنجاح' })
  async getAllApplications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('unassigned') unassigned?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    const filters = {
      search: search || undefined,
      status: status || undefined,
      employeeId: employeeId ? parseInt(employeeId, 10) : undefined,
      unassigned: unassigned === 'true',
    };

    return this.marketingService.getAllTraineesWithMarketing(pageNum, limitNum, filters);
  }

  @Post('applications')
  @RequirePermission('marketing.applications', 'create')
  @ApiOperation({ summary: 'إضافة تقديم جديد' })
  @ApiResponse({ status: 201, description: 'تم إضافة التقديم بنجاح' })
  async createApplication(@Body() createApplicationDto: CreateMarketingApplicationDto) {
    return this.marketingService.createApplication(createApplicationDto);
  }

  @Get('applications/employee/:employeeId')
  @RequirePermission('marketing.applications', 'view')
  @ApiOperation({ summary: 'عرض تقديمات موظف معين' })
  @ApiResponse({ status: 200, description: 'تم جلب البيانات بنجاح' })
  async getApplicationsByEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
  ) {
    return this.marketingService.getApplicationsByEmployee(employeeId, page, limit);
  }

  @Put('applications/:id')
  @RequirePermission('marketing.applications', 'edit')
  @ApiOperation({ summary: 'تعديل تقديم' })
  @ApiResponse({ status: 200, description: 'تم التعديل بنجاح' })
  async updateApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateApplicationDto: UpdateMarketingApplicationDto,
  ) {
    return this.marketingService.updateApplication(id, updateApplicationDto);
  }

  @Delete('applications/:id')
  @RequirePermission('marketing.applications', 'delete')
  @ApiOperation({ summary: 'حذف تقديم' })
  @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
  async deleteApplication(@Param('id', ParseIntPipe) id: number) {
    return this.marketingService.deleteApplication(id);
  }

  // ==================== إحصائيات ====================

  @Get('stats/employee/:employeeId')
  @RequirePermission('marketing.stats', 'view')
  @ApiOperation({ summary: 'إحصائيات موظف تسويق' })
  @ApiResponse({ status: 200, description: 'تم جلب الإحصائيات بنجاح' })
  async getEmployeeStats(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('month', ParseIntPipe) month?: number,
    @Query('year', ParseIntPipe) year?: number,
  ) {
    return this.marketingService.getEmployeeStats(employeeId, month, year);
  }
}
