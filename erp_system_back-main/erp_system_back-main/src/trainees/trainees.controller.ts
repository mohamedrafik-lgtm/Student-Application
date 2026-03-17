import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
  UsePipes,
  ValidationPipe,
  Res,
} from '@nestjs/common';
import { TraineesService } from './trainees.service';
import { CreateTraineeDto } from './dto/create-trainee.dto';
import { UpdateTraineeDto } from './dto/update-trainee.dto';
import { CreateTraineeDocumentDto, UpdateTraineeDocumentDto } from './dto/create-trainee-document.dto';
import { CreateTraineeNoteDto } from './dto/create-trainee-note.dto';
import { UpdateTraineeNoteDto } from './dto/update-trainee-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('trainees')
@Controller('trainees')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TraineesController {
  constructor(
    private readonly traineesService: TraineesService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء متدرب جديد' })
  @ApiBody({ type: CreateTraineeDto })
  @ApiResponse({ status: 201, description: 'تم إنشاء المتدرب بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  create(@Body() createTraineeDto: CreateTraineeDto, @Request() req) {
    return this.traineesService.create(createTraineeDto, req.user.userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'الحصول على إحصائيات المتدربين' })
  @ApiResponse({ status: 200, description: 'إحصائيات المتدربين' })
  getStats() {
    return this.traineesService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'الحصول على جميع المتدربين' })
  @ApiResponse({ status: 200, description: 'قائمة المتدربين' })
  async findAll(
    @Query('includeDetails') includeDetails?: string,
    @Query('programId') programId?: string,
    @Query('classroomId') classroomId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Request() req?: any
  ) {
    console.log('🌐 TraineesController.findAll called with query params:', {
      includeDetails,
      programId,
      classroomId,
      status,
      search,
      page,
      limit,
      sortBy,
      sortOrder
    });
    
    const includeDetailsFlag = includeDetails === 'true';
    const requestedProgramId = programId ? parseInt(programId) : undefined;
    
    // تطبيق فلتر البرامج المسموحة
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, requestedProgramId);
    
    const filters = {
      programId: programFilter.programId as number | undefined,
      classroomId: classroomId ? parseInt(classroomId) : undefined,
      status,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      sortOrder,
    };
    
    console.log('📋 Parsed filters:', filters);
    
    return this.traineesService.findAll(includeDetailsFlag, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'الحصول على متدرب بواسطة المعرف' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'بيانات المتدرب' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.traineesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث بيانات متدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiBody({ type: UpdateTraineeDto })
  @ApiResponse({ status: 200, description: 'تم تحديث المتدرب بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTraineeDto: UpdateTraineeDto,
    @Request() req,
  ) {
    return this.traineesService.update(id, updateTraineeDto, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف متدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'تم حذف المتدرب بنجاح' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.traineesService.remove(id, req.user.userId);
  }

  @Get(':id/deletion-preview')
  @ApiOperation({ summary: 'معاينة البيانات التي سيتم حذفها عند حذف متدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'معاينة البيانات المرتبطة بالمتدرب' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  getDeletionPreview(@Param('id', ParseIntPipe) id: number) {
    return this.traineesService.getDeletionPreview(id);
  }

  // ======== إدارة أرشيف الوثائق ========

  @Get(':id/documents/download-archive')
  @ApiOperation({ summary: 'تحميل جميع وثائق المتدرب كملف ZIP' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'ملف ZIP يحتوي على جميع الوثائق' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  async downloadTraineeArchive(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: any,
    @Request() req
  ) {
    const zipBuffer = await this.traineesService.downloadTraineeArchive(id, req.user.userId);
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="trainee_archive_${id}.zip"`,
      'Content-Length': zipBuffer.length,
    });
    
    res.send(zipBuffer);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'الحصول على جميع وثائق المتدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'قائمة وثائق المتدرب مع إحصائيات الإكمال' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  getTraineeDocuments(@Param('id', ParseIntPipe) id: number) {
    return this.traineesService.getTraineeDocuments(id);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'رفع وثيقة جديدة أو تحديث موجودة' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiBody({ type: CreateTraineeDocumentDto })
  @ApiResponse({ status: 201, description: 'تم رفع الوثيقة بنجاح' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  uploadTraineeDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDocumentDto: CreateTraineeDocumentDto,
    @Request() req
  ) {
    return this.traineesService.uploadTraineeDocument(id, createDocumentDto, req.user.userId);
  }

  @Patch('documents/:documentId')
  @ApiOperation({ summary: 'تحديث حالة التحقق من الوثيقة' })
  @ApiParam({ name: 'documentId', description: 'معرف الوثيقة' })
  @ApiBody({ type: UpdateTraineeDocumentDto })
  @ApiResponse({ status: 200, description: 'تم تحديث الوثيقة بنجاح' })
  @ApiResponse({ status: 404, description: 'الوثيقة غير موجودة' })
  updateDocumentVerification(
    @Param('documentId') documentId: string,
    @Body() updateDto: UpdateTraineeDocumentDto,
    @Request() req
  ) {
    return this.traineesService.updateDocumentVerification(documentId, updateDto, req.user.userId);
  }

  @Delete('documents/:documentId')
  @ApiOperation({ summary: 'حذف وثيقة' })
  @ApiParam({ name: 'documentId', description: 'معرف الوثيقة' })
  @ApiResponse({ status: 200, description: 'تم حذف الوثيقة بنجاح' })
  @ApiResponse({ status: 404, description: 'الوثيقة غير موجودة' })
  deleteTraineeDocument(@Param('documentId') documentId: string, @Request() req) {
    return this.traineesService.deleteTraineeDocument(documentId, req.user.userId);
  }

  @Get('documents/bulk-download-archives')
  @ApiOperation({ summary: 'تحميل أرشيفات متعددة كملف ZIP واحد' })
  @ApiResponse({ status: 200, description: 'ملف ZIP يحتوي على أرشيفات متعددة' })
  async bulkDownloadArchives(
    @Query('programId') programId?: string,
    @Query('documentTypes') documentTypes?: string,
    @Res() res?: any,
    @Request() req?: any
  ) {
    const requestedProgramId = programId ? parseInt(programId) : null;
    // التحقق من صلاحية الوصول للبرنامج
    if (requestedProgramId) {
      await this.userProgramAccessService.applyProgramFilter(req.user.userId, requestedProgramId);
    }
    const types = documentTypes ? documentTypes.split(',') : [];
    const zipBuffer = await this.traineesService.bulkDownloadArchives(
      requestedProgramId,
      types,
      req.user.userId
    );
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="bulk_archives_${Date.now()}.zip"`,
      'Content-Length': zipBuffer.length,
    });
    
    res.send(zipBuffer);
  }

  @Get('documents/completion-stats')
  @ApiOperation({ summary: 'الحصول على إحصائيات إكمال الوثائق لجميع المتدربين' })
  @ApiResponse({ status: 200, description: 'إحصائيات إكمال الوثائق' })
  async getDocumentsCompletionStats(
    @Query('programId') programId?: string,
    @Query('completionStatus') completionStatus?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any
  ) {
    const requestedProgramId = programId ? parseInt(programId) : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, requestedProgramId);
    const filters = {
      programId: programFilter.programId as number | undefined,
      completionStatus,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    };
    return this.traineesService.getDocumentsCompletionStats(filters);
  }

  @Get('documents/detailed-report')
  @ApiOperation({ summary: 'الحصول على تقرير مفصل عن وثائق المتدربين' })
  @ApiResponse({ status: 200, description: 'تقرير مفصل يتضمن حالة كل وثيقة' })
  async getDetailedDocumentsReport(
    @Query('programId') programId?: string,
    @Query('completionStatus') completionStatus?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Request() req?: any
  ) {
    const requestedProgramId = programId ? parseInt(programId) : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, requestedProgramId);
    const filters = {
      programId: programFilter.programId as number | undefined,
      completionStatus,
      search,
      limit: limit ? parseInt(limit) : 10000,
    };
    return this.traineesService.getDetailedDocumentsReport(filters);
  }

  // ======== إدارة الرسوم والتحقق من الحالة ========

  @Post(':id/check-and-fix-fees')
  @ApiOperation({ summary: 'فحص وإصلاح الرسوم الناقصة للمتدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'تقرير حالة الرسوم ونتيجة الإصلاح' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  checkAndFixTraineeFees(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.traineesService.checkAndFixTraineeFees(id, req.user.userId);
  }

  @Post('programs/:programId/check-fees-completeness')
  @ApiOperation({ summary: 'فحص اكتمال الرسوم لجميع متدربي البرنامج' })
  @ApiParam({ name: 'programId', description: 'معرف البرنامج التدريبي' })
  @ApiResponse({ status: 200, description: 'تقرير شامل عن حالة الرسوم في البرنامج' })
  checkProgramFeesCompleteness(@Param('programId', ParseIntPipe) programId: number, @Request() req) {
    return this.traineesService.checkProgramFeesCompleteness(programId, req.user.userId);
  }

  @Delete(':id/debt')
  @ApiOperation({ summary: 'حذف مديونية المتدرب كاملاً من النظام' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'تم حذف مديونية المتدرب بالكامل مع إرجاع أرصدة الخزائن' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  deleteTraineeDebt(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.traineesService.deleteTraineeDebt(id, req.user.userId);
  }

  @Get(':id/available-fees')
  @ApiOperation({ summary: 'الحصول على رسوم البرنامج المتاحة للتطبيق على المتدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'قائمة الرسوم المتاحة للتطبيق' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  getAvailableFees(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.traineesService.loadAndApplyProgramFees(id, req.user.userId);
  }

  @Get(':id/available-additional-fees')
  @ApiOperation({ summary: 'الحصول على الرسوم الإضافية (غير الدراسية) المتاحة للتطبيق على المتدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'قائمة الرسوم الإضافية المتاحة للتطبيق' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  getAvailableAdditionalFees(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.traineesService.loadAndApplyAdditionalFees(id, req.user.userId);
  }

  @Post(':id/apply-fees')
  @ApiOperation({ summary: 'تطبيق رسوم البرنامج المحددة على المتدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        feeIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'قائمة معرفات الرسوم المراد تطبيقها'
        }
      },
      required: ['feeIds']
    }
  })
  @ApiResponse({ status: 200, description: 'تم تطبيق الرسوم المحددة بنجاح' })
  @ApiResponse({ status: 400, description: 'خطأ في تطبيق الرسوم' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  applySelectedFees(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: { feeIds: number[] },
    @Request() req
  ) {
    return this.traineesService.loadAndApplyProgramFees(id, req.user.userId, body.feeIds);
  }

  @Post(':id/apply-additional-fees')
  @ApiOperation({ summary: 'تطبيق الرسوم الإضافية المحددة على المتدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        feeIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'قائمة معرفات الرسوم الإضافية المراد تطبيقها'
        }
      },
      required: ['feeIds']
    }
  })
  @ApiResponse({ status: 200, description: 'تم تطبيق الرسوم الإضافية المحددة بنجاح' })
  @ApiResponse({ status: 400, description: 'خطأ في تطبيق الرسوم الإضافية' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  applySelectedAdditionalFees(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: { feeIds: number[] },
    @Request() req
  ) {
    return this.traineesService.loadAndApplyAdditionalFees(id, req.user.userId, body.feeIds);
  }

  // ======== سجل تعديلات المتدربين ========

  @Get(':id/edit-history')
  @ApiOperation({ summary: 'الحصول على سجل تعديلات المتدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'سجل التعديلات' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  getTraineeEditHistory(@Param('id', ParseIntPipe) id: number) {
    return this.traineesService.getTraineeEditHistory(id);
  }

  // ======== إدارة ملاحظات المتدربين ========

  @Get(':id/notes')
  @ApiOperation({ summary: 'الحصول على جميع ملاحظات المتدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'قائمة ملاحظات المتدرب' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  getTraineeNotes(@Param('id', ParseIntPipe) id: number) {
    return this.traineesService.getTraineeNotes(id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'إضافة ملاحظة جديدة للمتدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiBody({ type: CreateTraineeNoteDto })
  @ApiResponse({ status: 201, description: 'تم إضافة الملاحظة بنجاح' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  createTraineeNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() createNoteDto: CreateTraineeNoteDto,
    @Request() req
  ) {
    return this.traineesService.createTraineeNote(id, createNoteDto, req.user.userId);
  }

  @Patch('notes/:noteId')
  @ApiOperation({ summary: 'تحديث ملاحظة موجودة' })
  @ApiParam({ name: 'noteId', description: 'معرف الملاحظة' })
  @ApiBody({ type: UpdateTraineeNoteDto })
  @ApiResponse({ status: 200, description: 'تم تحديث الملاحظة بنجاح' })
  @ApiResponse({ status: 404, description: 'الملاحظة غير موجودة' })
  updateTraineeNote(
    @Param('noteId') noteId: string,
    @Body() updateNoteDto: UpdateTraineeNoteDto,
    @Request() req
  ) {
    return this.traineesService.updateTraineeNote(noteId, updateNoteDto, req.user.userId);
  }

  @Delete('notes/:noteId')
  @ApiOperation({ summary: 'حذف ملاحظة' })
  @ApiParam({ name: 'noteId', description: 'معرف الملاحظة' })
  @ApiResponse({ status: 200, description: 'تم حذف الملاحظة بنجاح' })
  @ApiResponse({ status: 404, description: 'الملاحظة غير موجودة' })
  deleteTraineeNote(@Param('noteId') noteId: string, @Request() req) {
    return this.traineesService.deleteTraineeNote(noteId, req.user.userId);
  }

  // ======== استخراج بيانات المتدربين ========

  @Post('export')
  @ApiOperation({ summary: 'استخراج بيانات المتدربين في ملف Excel' })
  @ApiResponse({ status: 200, description: 'ملف Excel يحتوي على بيانات المتدربين' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  async exportTrainees(
    @Body() exportOptions: any,
    @Request() req?: any,
    @Res() res?: any
  ) {
    const buffer = await this.traineesService.exportTrainees(exportOptions, req?.user?.userId);
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="trainees_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      'Content-Length': buffer.length,
    });
    
    res.send(buffer);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'تحويل متدرب من برنامج إلى برنامج آخر' })
  @ApiResponse({ status: 200, description: 'تم تحويل المتدرب بنجاح' })
  @ApiResponse({ status: 400, description: 'خطأ في البيانات المرسلة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        traineeId: { type: 'number', description: 'معرف المتدرب' },
        newProgramId: { type: 'number', description: 'معرف البرنامج الجديد' }
      },
      required: ['traineeId', 'newProgramId']
    }
  })
  async transferTrainee(
    @Body() transferData: { traineeId: number; newProgramId: number; deleteOldDebt?: boolean },
    @Request() req,
  ) {
    return await this.traineesService.transferTrainee(transferData.traineeId, transferData.newProgramId, req?.user?.userId, transferData.deleteOldDebt || false);
  }

  // ======== إدارة استثناءات مواعيد السداد ========

  @Post(':id/payment-exception')
  @ApiOperation({ summary: 'إنشاء استثناء موعد سداد لمتدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الاستثناء بنجاح' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  createPaymentException(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
    @Request() req
  ) {
    return this.traineesService.createPaymentException(id, data, req.user.userId);
  }

  @Get(':id/payment-exceptions')
  @ApiOperation({ summary: 'الحصول على استثناءات مواعيد السداد للمتدرب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'قائمة الاستثناءات' })
  getPaymentExceptions(@Param('id', ParseIntPipe) id: number) {
    return this.traineesService.getTraineePaymentExceptions(id);
  }

  @Delete(':traineeId/payment-exceptions/:exceptionId')
  @ApiOperation({ summary: 'حذف استثناء موعد سداد' })
  @ApiParam({ name: 'traineeId', description: 'معرف المتدرب' })
  @ApiParam({ name: 'exceptionId', description: 'معرف الاستثناء' })
  @ApiResponse({ status: 200, description: 'تم حذف الاستثناء بنجاح' })
  @ApiResponse({ status: 404, description: 'الاستثناء غير موجود' })
  deletePaymentException(
    @Param('traineeId', ParseIntPipe) traineeId: number,
    @Param('exceptionId') exceptionId: string,
    @Request() req
  ) {
    return this.traineesService.deletePaymentException(exceptionId, req.user.userId);
  }

  @Get(':id/fees-with-schedules')
  @ApiOperation({ summary: 'الحصول على رسوم المتدرب التي لها جداول سداد' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'قائمة الرسوم التي لها جداول سداد' })
  getFeesWithSchedules(@Param('id', ParseIntPipe) traineeId: number) {
    return this.traineesService.getTraineeFeesWithSchedules(traineeId);
  }

  @Post(':id/send-schedule-whatsapp')
  @ApiOperation({ summary: 'إرسال الجدول الدراسي للمتدرب عبر واتساب' })
  @ApiParam({ name: 'id', description: 'معرف المتدرب' })
  @ApiResponse({ status: 200, description: 'تم إرسال الجدول بنجاح' })
  @ApiResponse({ status: 404, description: 'المتدرب غير موجود' })
  async sendScheduleWhatsApp(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const { whatsappService } = req.app.get('UnifiedWhatsAppService') || {};
    if (whatsappService) {
      const success = await whatsappService.sendScheduleToTrainee(id, req.user.userId);
      return { success, message: success ? 'تم إرسال الجدول بنجاح' : 'فشل الإرسال' };
    }
    return { success: false, message: 'خدمة الواتساب غير متاحة' };
  }
}