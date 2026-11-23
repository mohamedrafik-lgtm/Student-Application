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
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import { existsSync, mkdirSync, openSync, readSync, closeSync, unlinkSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { PaperExamsService } from './paper-exams.service';
import { CreatePaperExamDto } from './dto/create-paper-exam.dto';
import { UpdatePaperExamDto } from './dto/update-paper-exam.dto';
import { CreateExamModelDto } from './dto/create-exam-model.dto';
import { SubmitAnswerSheetDto } from './dto/submit-answer-sheet.dto';
import { UploadGradesExcelDto } from './dto/upload-grades-excel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission, RequireMultiple } from '../permissions/decorators/require-permission.decorator';

// ملفات التصحيح تحتوي على بيانات متدربين، لذلك لا تحفظ داخل مجلد الملفات العامة.
const privateBatchPdfDir = resolve(process.cwd(), 'private', 'batch-pdfs');

@ApiTags('paper-exams')
@Controller('paper-exams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaperExamsController {
  constructor(private readonly paperExamsService: PaperExamsService) {}

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'create')
  @ApiOperation({ summary: 'إنشاء اختبار ورقي جديد' })
  create(@Body() createDto: CreatePaperExamDto, @Request() req) {
    return this.paperExamsService.create(createDto, req.user.userId);
  }

  @Post('models')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'create')
  @ApiOperation({ summary: 'إنشاء نموذج أسئلة للاختبار' })
  createModel(@Body() createDto: CreateExamModelDto, @Request() req) {
    return this.paperExamsService.createModel(createDto, req.user.userId);
  }

  @Post(':id/models/:modelId/generate-sheets')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'generate_sheets')
  @ApiOperation({ summary: 'توليد أوراق الإجابة لجميع المتدربين' })
  generateAnswerSheets(
    @Param('id', ParseIntPipe) id: number,
    @Param('modelId', ParseIntPipe) modelId: number,
  ) {
    return this.paperExamsService.generateAnswerSheets(id, modelId);
  }

  @Post(':id/create-multiple-models')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'generate_sheets')
  @ApiOperation({ summary: 'إنشاء نماذج متعددة وتوزيع الطلاب تلقائياً' })
  async createMultipleModels(
    @Param('id', ParseIntPipe) examId: number,
    @Body('numberOfModels', ParseIntPipe) numberOfModels: number,
    @Body('questions') questions: Array<{ questionId: number; points: number }>,
    @Body('distributionMethod') distributionMethod: 'alphabetical' | 'by_distribution' | 'single_room' | 'custom_committees' | 'custom_groups',
    @Body('distributionId') distributionId?: string,
    @Body('roomId') roomId?: string,
    @Body('numberOfCommittees') numberOfCommittees?: number,
    @Body('modelsPerCommittee') modelsPerCommittee?: number,
    @Body('groupsSettings') groupsSettings?: Array<{ roomId: string; numberOfCommittees: number; modelsPerCommittee: number }>,
    @Request() req?,
  ) {
    return this.paperExamsService.createMultipleModelsWithDistribution(
      examId,
      numberOfModels,
      questions,
      req.user.userId,
      distributionMethod,
      distributionId,
      roomId,
      numberOfCommittees,
      modelsPerCommittee,
      groupsSettings,
    );
  }

  @Post('scan-answer-sheet')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'مسح وتصحيح ورقة إجابة من الكاميرا' })
  scanAnswerSheet(@Body() data: any, @Request() req) {
    return this.paperExamsService.processScannedAnswerSheet(
      data.sheetCode,
      data.ocrData,
      data.scannedImageUrl,
      req.user.userId,
    );
  }

  @Get('answer-sheet/:sheetCode')
  @UseGuards(PermissionGuard)
  @RequireMultiple({
    permissions: [
      { resource: 'dashboard.paper-exams', action: 'grade' },
      { resource: 'dashboard.paper-exams', action: 'print_answer_sheets' },
    ],
    operator: 'OR',
  })
  @ApiOperation({ summary: 'الحصول على ورقة إجابة بالكود' })
  getAnswerSheetByCode(
    @Param('sheetCode') sheetCode: string,
    @Query('examId') examId?: string,
  ) {
    const parsedExamId = examId === undefined ? undefined : Number(examId);
    if (parsedExamId !== undefined && !Number.isInteger(parsedExamId)) {
      throw new BadRequestException('معرّف الاختبار غير صالح');
    }
    return this.paperExamsService.getAnswerSheetByCode(sheetCode, parsedExamId);
  }

  @Get(':id/answer-sheet/by-code/:sheetCode')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'الحصول على ورقة الإجابة للتصحيح داخل اختبار محدد' })
  getAnswerSheetForGrading(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sheetCode') sheetCode: string,
  ) {
    return this.paperExamsService.getAnswerSheetByCode(sheetCode, examId, true);
  }

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'view')
  @ApiOperation({ summary: 'الحصول على جميع الاختبارات الورقية' })
  findAll(@Query('contentId') contentId?: string) {
    return this.paperExamsService.findAll(contentId ? parseInt(contentId) : undefined);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'view')
  @ApiOperation({ summary: 'الحصول على اختبار ورقي محدد' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paperExamsService.findOne(id);
  }

  @Get(':id/report')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'view_reports')
  @ApiOperation({ summary: 'الحصول على تقرير الاختبار' })
  getReport(@Param('id', ParseIntPipe) id: number) {
    return this.paperExamsService.getExamReport(id);
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'edit')
  @ApiOperation({ summary: 'تحديث اختبار ورقي' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePaperExamDto,
  ) {
    return this.paperExamsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'delete')
  @ApiOperation({ summary: 'حذف اختبار ورقي' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paperExamsService.remove(id);
  }

  @Get(':id/models/:modelId/sheets')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'print_answer_sheets')
  @ApiOperation({ summary: 'الحصول على جميع أوراق الإجابة لنموذج معين' })
  getModelSheets(
    @Param('id', ParseIntPipe) id: number,
    @Param('modelId', ParseIntPipe) modelId: number,
  ) {
    return this.paperExamsService.getModelSheets(id, modelId);
  }

  @Get('models/:modelId')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'print_questions')
  @ApiOperation({ summary: 'الحصول على نموذج أسئلة محدد' })
  getModel(@Param('modelId', ParseIntPipe) modelId: number) {
    return this.paperExamsService.getModel(modelId);
  }

  @Delete('models/:modelId')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'delete')
  @ApiOperation({ summary: 'حذف نموذج أسئلة' })
  async deleteModel(@Param('modelId', ParseIntPipe) modelId: number) {
    await this.paperExamsService.deleteModel(modelId);
    return { message: 'تم حذف النموذج بنجاح' };
  }

  @Get(':id/search-students')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'view')
  @ApiOperation({ summary: 'البحث عن طلاب في اختبار' })
  async searchStudents(
    @Param('id', ParseIntPipe) examId: number,
    @Query('q') query: string
  ) {
    return this.paperExamsService.searchStudents(examId, query);
  }

  @Get(':id/scan-config')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'الحصول على إعدادات مسح أوراق الاختبار' })
  getScanConfig(@Param('id', ParseIntPipe) examId: number) {
    return this.paperExamsService.getScanConfig(examId);
  }

  @Get(':id/download-grades-template')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'تحميل ملف Excel بقائمة المتدربين لإدخال الدرجات' })
  async downloadGradesTemplate(
    @Param('id', ParseIntPipe) examId: number,
    @Res() res: Response,
  ) {
    const buffer = await this.paperExamsService.generateGradesExcelTemplate(examId);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=exam-${examId}-grades-template.xlsx`);
    res.send(buffer);
  }

  @Post(':id/upload-grades-excel')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'رفع ملف Excel لإدخال الدرجات تلقائياً' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadGradesExcel(
    @Param('id', ParseIntPipe) examId: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.paperExamsService.processGradesExcel(examId, file.buffer, req.user.userId);
  }

  @Get(':id/committees-sheets')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'print_answer_sheets')
  @ApiOperation({ summary: 'الحصول على أوراق الإجابة مرتبة حسب اللجان' })
  async getCommitteesSheets(@Param('id', ParseIntPipe) examId: number) {
    return this.paperExamsService.getCommitteesSheets(examId);
  }

  @Get(':id/groups-sheets')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'print_answer_sheets')
  @ApiOperation({ summary: 'الحصول على أوراق الإجابة مرتبة حسب المجموعات واللجان' })
  async getGroupsSheets(@Param('id', ParseIntPipe) examId: number) {
    return this.paperExamsService.getGroupsSheets(examId);
  }

  // ========== Batch Grading APIs ==========
  
  @Post(':id/batch-grading/upload-pdf')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'رفع ملف PDF للتصحيح المتعدد' })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        if (!existsSync(privateBatchPdfDir)) {
          mkdirSync(privateBatchPdfDir, { recursive: true });
        }
        cb(null, privateBatchPdfDir);
      },
      filename: (req, file, cb) => {
        // اسم فريد للملف
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `batch-${uniqueSuffix}.pdf`);
      },
    }),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
    fileFilter: (req, file, callback) => {
      if (file.mimetype === 'application/pdf' && extname(file.originalname).toLowerCase() === '.pdf') {
        callback(null, true);
      } else {
        callback(new BadRequestException('يجب أن يكون الملف بصيغة PDF'), false);
      }
    },
  }))
  async uploadBatchPdf(
    @Param('id', ParseIntPipe) examId: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('لم يتم رفع ملف');
    }
    const descriptor = openSync(file.path, 'r');
    const signatureBuffer = Buffer.alloc(5);
    try {
      readSync(descriptor, signatureBuffer, 0, signatureBuffer.length, 0);
    } finally {
      closeSync(descriptor);
    }
    const pdfSignature = signatureBuffer.toString('ascii');
    if (pdfSignature !== '%PDF-') {
      unlinkSync(file.path);
      throw new BadRequestException('محتوى الملف لا يطابق صيغة PDF');
    }
    return {
      success: true,
      fileName: file.originalname,
      // يعاد الاسم المعزول فقط، ولا يكشف مسار التخزين الخاص على الخادم.
      filePath: basename(file.path),
      size: file.size,
    };
  }

  @Post(':id/batch-grading/sessions')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'إنشاء جلسة تصحيح متعدد جديدة' })
  async createBatchSession(
    @Param('id', ParseIntPipe) examId: number,
    @Body('fileName') fileName: string,
    @Body('filePath') filePath: string,
    @Body('totalPages') totalPages: number,
    @Request() req,
  ) {
    return this.paperExamsService.createBatchGradingSession(examId, fileName, filePath, totalPages, req.user.userId);
  }

  @Patch(':id/batch-grading/sessions/:sessionId')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'تحديث حالة جلسة التصحيح' })
  async updateBatchSession(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
    @Body() updateData: any,
  ) {
    return this.paperExamsService.updateBatchGradingSession(examId, sessionId, updateData);
  }

  @Get(':id/batch-grading/sessions')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'الحصول على جميع جلسات التصحيح المتعدد' })
  async getBatchSessions(@Param('id', ParseIntPipe) examId: number) {
    return this.paperExamsService.getBatchGradingSessions(examId);
  }

  @Get(':id/batch-grading/sessions/:sessionId')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'الحصول على تفاصيل جلسة معينة' })
  async getBatchSession(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
  ) {
    return this.paperExamsService.getBatchGradingSessionDetails(examId, sessionId);
  }

  @Get(':id/batch-grading/sessions/:sessionId/details')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'الحصول على تفاصيل كاملة لجلسة معينة مع جميع السجلات' })
  async getBatchSessionDetails(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
  ) {
    return this.paperExamsService.getBatchGradingSessionDetails(examId, sessionId);
  }

  @Delete(':id/batch-grading/sessions/:sessionId')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'حذف جلسة تصحيح' })
  async deleteBatchSession(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
  ) {
    return this.paperExamsService.deleteBatchGradingSession(examId, sessionId);
  }

  @Post(':id/batch-grading/sessions/:sessionId/results')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'إضافة نتيجة تصحيح ناجحة' })
  async addBatchResult(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
    @Body() resultData: any,
  ) {
    return this.paperExamsService.addBatchGradingResult(examId, sessionId, resultData);
  }

  @Post(':id/batch-grading/sessions/:sessionId/skipped')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'إضافة ورقة متجاهلة' })
  async addBatchSkipped(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
    @Body() skippedData: any,
  ) {
    return this.paperExamsService.addBatchGradingSkipped(examId, sessionId, skippedData);
  }

  @Post(':id/batch-grading/sessions/:sessionId/already-graded')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'إضافة ورقة مصححة سابقاً' })
  async addBatchAlreadyGraded(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
    @Body() alreadyGradedData: any,
  ) {
    return this.paperExamsService.addBatchGradingAlreadyGraded(examId, sessionId, alreadyGradedData);
  }

  @Post(':id/batch-grading/sessions/:sessionId/failures')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'إضافة حالة فشل' })
  async addBatchFailure(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
    @Body() failureData: any,
  ) {
    return this.paperExamsService.addBatchGradingFailure(examId, sessionId, failureData);
  }
}
