import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { FinancesService } from './finances.service';
import { FinancialAuditService } from './financial-audit.service';
import { CreateSafeDto } from './dto/create-safe.dto';
import { UpdateSafeDto } from './dto/update-safe.dto';
import { SafeCategory, SAFE_CATEGORY_LABELS } from './dto/safe-category.enum';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateTraineeFeeDto } from './dto/create-trainee-fee.dto';
import { UpdateTraineeFeeDto } from './dto/update-trainee-fee.dto';
import { ApplyTraineeFeeDto } from './dto/apply-trainee-fee.dto';
import { AutoApplyFeesDto } from './dto/auto-apply-fees.dto';
import { AutoPaymentDto } from './dto/auto-payment.dto';
import { CreateTraineePaymentDto } from './dto/create-trainee-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('finances')
@Controller('finances')
@UseGuards(JwtAuthGuard)
export class FinancesController {
  constructor(
    private readonly financesService: FinancesService,
    private readonly auditService: FinancialAuditService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  // ======== الخزائن ========

  @Post('safes')
  @ApiOperation({ summary: 'إنشاء خزينة جديدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الخزينة بنجاح' })
  createSafe(@Body() createSafeDto: CreateSafeDto, @Req() req) {
    console.log('🎯 Controller - البيانات المستلمة:', createSafeDto);
    console.log('🔍 نوع البيانات:', typeof createSafeDto);
    console.log('📊 مفاتيح البيانات:', Object.keys(createSafeDto));
    return this.financesService.createSafe(createSafeDto, req.user?.userId || req.user?.id, req);
  }

  @Get('safes/categories')
  @ApiOperation({ summary: 'الحصول على تصنيفات الخزائن' })
  getSafeCategories() {
    return {
      categories: Object.values(SafeCategory),
      labels: SAFE_CATEGORY_LABELS
    };
  }

  @Get('safes')
  @ApiOperation({ summary: 'الحصول على جميع الخزائن' })
  async findAllSafes() {
    try {
      return await this.financesService.findAllSafes();
    } catch (error) {
      console.error('❌ Controller Error - findAllSafes:', error);
      throw error;
    }
  }

  @Get('safes/:id')
  @ApiOperation({ summary: 'الحصول على خزينة محددة' })
  findSafeById(@Param('id') id: string) {
    return this.financesService.findSafeById(id);
  }

  @Patch('safes/:id')
  @ApiOperation({ summary: 'تحديث خزينة محددة' })
  updateSafe(@Param('id') id: string, @Body() updateSafeDto: UpdateSafeDto, @Req() req) {
    return this.financesService.updateSafe(id, updateSafeDto, req.user?.userId || req.user?.id, req);
  }

  @Delete('safes/:id')
  @ApiOperation({ summary: 'حذف خزينة (إذا كانت فارغة ولا تحتوي على معاملات)' })
  deleteSafe(@Param('id') id: string, @Req() req) {
    return this.financesService.deleteSafe(id, req.user?.userId || req.user?.id, req);
  }

  // ======== المعاملات المالية ========

  @Post('transactions')
  @ApiOperation({ summary: 'إنشاء معاملة مالية جديدة' })
  createTransaction(@Body() createTransactionDto: CreateTransactionDto, @Req() req) {
    return this.financesService.createTransaction(createTransactionDto, req.user?.userId || req.user?.id, req);
  }

  @Get('safes/:safeId/transactions')
  @ApiOperation({ summary: 'الحصول على معاملات خزينة محددة مع فلترة التاريخ' })
  @ApiResponse({ status: 200, description: 'قائمة معاملات الخزينة' })
  async findTransactionsBySafe(
    @Param('safeId') safeId: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    try {
      const limitNum = limit ? parseInt(limit, 10) : 1000;
      console.log(`📥 Controller - findTransactionsBySafe: safeId=${safeId}, limit=${limitNum}, dateFrom=${dateFrom}, dateTo=${dateTo}`);
      return await this.financesService.findTransactionsBySafe(safeId, limitNum, dateFrom, dateTo);
    } catch (error) {
      console.error('❌ Controller Error - findTransactionsBySafe:', error);
      throw error;
    }
  }

  // ======== القيود المالية والتحويلات ========

  @Post('transfer')
  @ApiOperation({ summary: 'تحويل مبلغ بين الخزائن' })
  @ApiResponse({ status: 201, description: 'تم التحويل بنجاح' })
  async transferBetweenSafes(@Body() transferDto: {
    fromSafeId: string;
    toSafeId: string;
    amount: number;
    description: string;
  }, @Req() req) {
    try {
      console.log('📥 Controller - transferBetweenSafes:', transferDto);
      return await this.financesService.transferBetweenSafes(
        transferDto.fromSafeId,
        transferDto.toSafeId,
        transferDto.amount,
        transferDto.description,
        req.user?.userId || req.user?.id,
        req
      );
    } catch (error) {
      console.error('❌ Controller Error - transferBetweenSafes:', error);
      throw error;
    }
  }

  @Get('entries')
  @ApiOperation({ summary: 'الحصول على سجل القيود المالية مع pagination وفلترة التاريخ' })
  @ApiResponse({ status: 200, description: 'قائمة القيود المالية مع معلومات pagination' })
  async getFinancialEntries(
    @Query('page') page?: string, 
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;
      console.log(`📥 Controller - getFinancialEntries: page=${pageNum}, limit=${limitNum}, dateFrom=${dateFrom}, dateTo=${dateTo}, search=${search}`);
      return await this.financesService.getFinancialEntries(pageNum, limitNum, dateFrom, dateTo, search);
    } catch (error) {
      console.error('❌ Controller Error - getFinancialEntries:', error);
      throw error;
    }
  }

  // ======== رسوم المتدربين ========

  @Post('trainee-fees')
  @ApiOperation({ summary: 'إنشاء رسوم متدربين جديدة' })
  createTraineeFee(@Body() createTraineeFeeDto: CreateTraineeFeeDto, @Req() req) {
    return this.financesService.createTraineeFee(createTraineeFeeDto, req.user?.userId || req.user?.id, req);
  }

  @Get('trainee-fees')
  @ApiOperation({ summary: 'الحصول على جميع رسوم المتدربين' })
  findAllTraineeFees(@Query('programId') programId?: string) {
    return this.financesService.findAllTraineeFees(programId ? parseInt(programId) : undefined);
  }

  @Get('trainee-fees/:id')
  @ApiOperation({ summary: 'الحصول على رسوم متدربين محددة' })
  findTraineeFeesById(@Param('id') id: string) {
    return this.financesService.findTraineeFeesById(+id);
  }

  @Get('trainee-fees/:id/report')
  @ApiOperation({ summary: 'الحصول على تقرير رسوم متدربين حسب النوع' })
  @ApiResponse({ status: 200, description: 'تقرير الرسوم' })
  findTraineeFeeReport(
    @Param('id') id: string,
    @Query('type') type?: string
  ) {
    return this.financesService.findTraineeFeeReport(+id, type);
  }

  @Patch('trainee-fees/:id')
  @ApiOperation({ summary: 'تحديث رسوم المتدربين (غير المطبقة فقط)' })
  updateTraineeFee(@Param('id') id: string, @Body() updateTraineeFeeDto: UpdateTraineeFeeDto, @Req() req) {
    return this.financesService.updateTraineeFee(+id, updateTraineeFeeDto, req.user?.userId || req.user?.id, req);
  }

  @Delete('trainee-fees/:id')
  @ApiOperation({ summary: 'حذف رسوم المتدربين (غير المطبقة فقط)' })
  deleteTraineeFee(@Param('id') id: string, @Req() req) {
    return this.financesService.deleteTraineeFee(+id, req.user?.userId || req.user?.id, req);
  }

  @Post('trainee-fees/:id/apply')
  @ApiOperation({ summary: 'تطبيق رسوم على المتدربين' })
  applyTraineeFee(
    @Param('id') id: string,
    @Body() applyTraineeFeeDto: ApplyTraineeFeeDto,
    @Req() req,
  ) {
    return this.financesService.applyTraineeFee(+id, applyTraineeFeeDto, req.user?.userId || req.user?.id, req);
  }

  @Post('auto-apply-fees')
  @ApiOperation({ summary: 'تطبيق تلقائي لرسوم البرنامج على متدرب جديد' })
  autoApplyFeesToNewTrainee(@Body() autoApplyFeesDto: AutoApplyFeesDto, @Req() req) {
    return this.financesService.autoApplyFeesToNewTrainee(
      autoApplyFeesDto.traineeId,
      autoApplyFeesDto.programId,
      req.user.id,
    );
  }

  // ======== مدفوعات المتدربين ========

  @Post('trainee-payments')
  @ApiOperation({ summary: 'تسجيل دفعة جديدة' })
  createTraineePayment(@Body() createTraineePaymentDto: CreateTraineePaymentDto, @Req() req) {
    return this.financesService.createTraineePayment(
      createTraineePaymentDto, 
      req.user?.userId || req.user?.id, 
      req
    );
  }

  @Post('auto-payment')
  @ApiOperation({ summary: 'دفع تلقائي - توزيع المبلغ على الرسوم بترتيب الأقدم إلى الأحدث' })
  processAutoPayment(@Body() autoPaymentDto: AutoPaymentDto, @Req() req) {
    return this.financesService.processAutoPayment(
      autoPaymentDto.traineeId,
      autoPaymentDto.amount,
      autoPaymentDto.safeId,
      autoPaymentDto.notes,
      req.user?.userId || req.user?.id,
      req,
    );
  }

  @Get('trainee-payments/unpaid')
  @ApiOperation({ summary: 'الحصول على مدفوعات المتدربين غير المدفوعة' })
  findUnpaidTraineePayments() {
    return this.financesService.findUnpaidTraineePayments();
  }

  @Get('trainee-payments')
  @ApiOperation({ summary: 'الحصول على جميع مدفوعات المتدربين بكافة حالاتها مع Pagination' })
  findAllTraineePayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('traineeId') traineeId?: string,
    @Query('status') status?: string,
  ) {
    const filters = {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      traineeId: traineeId ? parseInt(traineeId) : undefined,
      status,
    };
    return this.financesService.findAllTraineePayments(filters);
  }

  @Get('trainee-payments-legacy')
  @ApiOperation({ summary: 'الحصول على جميع مدفوعات المتدربين (النسخة القديمة بدون pagination)' })
  findAllTraineePaymentsLegacy() {
    return this.financesService.findAllTraineePaymentsLegacy();
  }

  @Get('trainees-financial-data')
  @ApiOperation({ summary: 'الحصول على المتدربين مع البيانات المالية المحسوبة' })
  async getTraineesWithFinancialData(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('programId') programId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    const requestedProgramId = programId ? parseInt(programId) : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, requestedProgramId);
    const filters = {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      programId: programFilter.programId as number | undefined,
      status,
      search,
    };
    return this.financesService.getTraineesWithFinancialData(filters);
  }

  @Get('trainees/:traineeId/payments')
  @ApiOperation({ summary: 'الحصول على مدفوعات متدرب محدد' })
  findTraineePaymentsByTraineeId(@Param('traineeId') traineeId: string) {
    return this.financesService.findTraineePaymentsByTraineeId(+traineeId);
  }

  // ======== سجل العمليات المالية ========

  @Get('audit-logs')
  @ApiOperation({ summary: 'الحصول على سجل العمليات المالية' })
  @ApiResponse({ status: 200, description: 'تم جلب سجل العمليات بنجاح' })
  getFinancialAuditLogs(
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      action: action as any,
      entityType,
      entityId,
      userId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    };

    return this.auditService.getAuditLogs(filters);
  }

  @Get('audit-statistics')
  @ApiOperation({ summary: 'الحصول على إحصائيات سجل العمليات' })
  @ApiResponse({ status: 200, description: 'تم جلب الإحصائيات بنجاح' })
  getAuditStatistics() {
    return this.auditService.getAuditStatistics();
  }

  @Post('test-audit')
  @ApiOperation({ summary: 'اختبار تسجيل التدقيق' })
  async testAudit(@Req() req) {
    try {
      console.log('🧪 بدء اختبار التدقيق...');
      console.log('👤 بيانات المستخدم:', {
        id: req.user?.id,
        name: req.user?.name,
        nameAr: req.user?.nameAr,
        role: req.user?.role
      });

      // اختبار مباشر لقاعدة البيانات أولاً
      const directTest = await this.auditService['prisma'].financialAuditLog.create({
        data: {
          action: 'SYSTEM_ADJUSTMENT',
          entityType: 'Test',
          entityId: 'direct-test-1',
          description: 'اختبار مباشر لقاعدة البيانات',
          amount: 50,
          currency: 'EGP',
          userId: req.user.id || 'test-user',
          userName: req.user.nameAr || req.user.name || 'Test User',
          userRole: req.user.role || 'USER',
          isReversible: false,
        }
      });

      console.log('✅ نجح الاختبار المباشر:', directTest.id);

      // اختبار عبر الخدمة
      const context = {
        userId: req.user.id || 'test-user',
        userName: req.user.nameAr || req.user.name || 'Test User',
        userRole: req.user.role || 'USER',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
      };

      const serviceTest = await this.auditService.logFinancialOperation(
        {
          action: 'SYSTEM_ADJUSTMENT' as any,
          entityType: 'Test',
          entityId: 'service-test-1',
          description: 'اختبار عبر الخدمة',
          amount: 100,
          currency: 'EGP',
          isReversible: false,
        },
        context
      );

      return { 
        success: true, 
        directTestId: directTest.id,
        serviceTestId: serviceTest.id 
      };
    } catch (error) {
      console.error('❌ خطأ في اختبار التدقيق:', error);
      return { success: false, error: error.message, stack: error.stack };
    }
  }

  // ======== التقارير المالية ========

  @Get('reports/dashboard')
  @ApiOperation({ summary: 'تقرير لوحة التحكم المالية' })
  @ApiResponse({ status: 200, description: 'تم استرجاع التقرير بنجاح' })
  async getFinancialDashboard(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Req() req?: any
  ) {
    return this.financesService.getFinancialDashboard({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get('reports/income-analysis')
  @ApiOperation({ summary: 'تحليل الدخل حسب الخزائن والفترة' })
  @ApiResponse({ status: 200, description: 'تم استرجاع تحليل الدخل بنجاح' })
  async getIncomeAnalysis(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('safeId') safeId?: string,
    @Req() req?: any
  ) {
    return this.financesService.getIncomeAnalysis({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      safeId,
    });
  }

  @Get('reports/transactions-summary')
  @ApiOperation({ summary: 'ملخص المعاملات المالية' })
  @ApiResponse({ status: 200, description: 'تم استرجاع ملخص المعاملات بنجاح' })
  async getTransactionsSummary(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('type') type?: string,
    @Req() req?: any
  ) {
    return this.financesService.getTransactionsSummary({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      type: type as any,
    });
  }
} 