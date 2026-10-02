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
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { PaperExamsService } from './paper-exams.service';
import { CreatePaperExamDto } from './dto/create-paper-exam.dto';
import { UpdatePaperExamDto } from './dto/update-paper-exam.dto';
import { CreateExamModelDto } from './dto/create-exam-model.dto';
import { SubmitAnswerSheetDto } from './dto/submit-answer-sheet.dto';
import { UploadGradesExcelDto } from './dto/upload-grades-excel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

// إنشاء مجلد رفع PDF إذا لم يكن موجوداً
const uploadDir = './uploads/batch-pdfs';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('paper-exams')
@Controller('paper-exams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaperExamsController {
  constructor(private readonly paperExamsService: PaperExamsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء اختبار ورقي جديد' })
  create(@Body() createDto: CreatePaperExamDto, @Request() req) {
    return this.paperExamsService.create(createDto, req.user.userId);
  }

  @Post('models')
  @ApiOperation({ summary: 'إنشاء نموذج أسئلة للاختبار' })
  createModel(@Body() createDto: CreateExamModelDto, @Request() req) {
    return this.paperExamsService.createModel(createDto, req.user.userId);
  }

  @Post(':id/models/:modelId/generate-sheets')
  @ApiOperation({ summary: 'توليد أوراق الإجابة لجميع المتدربين' })
  generateAnswerSheets(
    @Param('id', ParseIntPipe) id: number,
    @Param('modelId', ParseIntPipe) modelId: number,
  ) {
    return this.paperExamsService.generateAnswerSheets(id, modelId);
  }

  @Post(':id/create-multiple-models')
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
  @ApiOperation({ summary: 'الحصول على ورقة إجابة بالكود' })
  getAnswerSheetByCode(@Param('sheetCode') sheetCode: string) {
    return this.paperExamsService.getAnswerSheetByCode(sheetCode);
  }

  @Get()
  @ApiOperation({ summary: 'الحصول على جميع الاختبارات الورقية' })
  findAll(@Query('contentId') contentId?: string) {
    return this.paperExamsService.findAll(contentId ? parseInt(contentId) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'الحصول على اختبار ورقي محدد' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paperExamsService.findOne(id);
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'الحصول على تقرير الاختبار' })
  getReport(@Param('id', ParseIntPipe) id: number) {
    return this.paperExamsService.getExamReport(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث اختبار ورقي' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePaperExamDto,
  ) {
    return this.paperExamsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف اختبار ورقي' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paperExamsService.remove(id);
  }

  @Get(':id/models/:modelId/sheets')
  @ApiOperation({ summary: 'الحصول على جميع أوراق الإجابة لنموذج معين' })
  getModelSheets(
    @Param('id', ParseIntPipe) id: number,
    @Param('modelId', ParseIntPipe) modelId: number,
  ) {
    return this.paperExamsService.getModelSheets(id, modelId);
  }

  @Get('models/:modelId')
  @ApiOperation({ summary: 'الحصول على نموذج أسئلة محدد' })
  getModel(@Param('modelId', ParseIntPipe) modelId: number) {
    return this.paperExamsService.getModel(modelId);
  }

  @Delete('models/:modelId')
  @ApiOperation({ summary: 'حذف نموذج أسئلة' })
  async deleteModel(@Param('modelId', ParseIntPipe) modelId: number) {
    await this.paperExamsService.deleteModel(modelId);
    return { message: 'تم حذف النموذج بنجاح' };
  }

  @Get(':id/search-students')
  @ApiOperation({ summary: 'البحث عن طلاب في اختبار' })
  async searchStudents(
    @Param('id', ParseIntPipe) examId: number,
    @Query('q') query: string
  ) {
    return this.paperExamsService.searchStudents(examId, query);
  }

  @Get(':id/download-grades-template')
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
  @ApiOperation({ summary: 'الحصول على أوراق الإجابة مرتبة حسب اللجان' })
  async getCommitteesSheets(@Param('id', ParseIntPipe) examId: number) {
    return this.paperExamsService.getCommitteesSheets(examId);
  }

  @Get(':id/groups-sheets')
  @ApiOperation({ summary: 'الحصول على أوراق الإجابة مرتبة حسب المجموعات واللجان' })
  async getGroupsSheets(@Param('id', ParseIntPipe) examId: number) {
    return this.paperExamsService.getGroupsSheets(examId);
  }

  // ========== Batch Grading APIs ==========
  
  @Post(':id/batch-grading/upload-pdf')
  @ApiOperation({ summary: 'رفع ملف PDF للتصحيح المتعدد' })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = './uploads/batch-pdfs';
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        // اسم فريد للملف
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `batch-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
    fileFilter: (req, file, callback) => {
      if (file.mimetype === 'application/pdf') {
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
    return {
      success: true,
      fileName: file.originalname,
      filePath: file.path,
      size: file.size,
    };
  }

  @Post(':id/batch-grading/sessions')
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
  @ApiOperation({ summary: 'تحديث حالة جلسة التصحيح' })
  async updateBatchSession(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
    @Body() updateData: any,
  ) {
    return this.paperExamsService.updateBatchGradingSession(sessionId, updateData);
  }

  @Get(':id/batch-grading/sessions')
  @ApiOperation({ summary: 'الحصول على جميع جلسات التصحيح المتعدد' })
  async getBatchSessions(@Param('id', ParseIntPipe) examId: number) {
    return this.paperExamsService.getBatchGradingSessions(examId);
  }

  @Get(':id/batch-grading/sessions/:sessionId')
  @ApiOperation({ summary: 'الحصول على تفاصيل جلسة معينة' })
  async getBatchSession(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
  ) {
    return this.paperExamsService.getBatchGradingSessionDetails(sessionId);
  }

  @Get(':id/batch-grading/sessions/:sessionId/details')
  @ApiOperation({ summary: 'الحصول على تفاصيل كاملة لجلسة معينة مع جميع السجلات' })
  async getBatchSessionDetails(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
  ) {
    return this.paperExamsService.getBatchGradingSessionDetails(sessionId);
  }

  @Delete(':id/batch-grading/sessions/:sessionId')
  @ApiOperation({ summary: 'حذف جلسة تصحيح' })
  async deleteBatchSession(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
  ) {
    return this.paperExamsService.deleteBatchGradingSession(sessionId);
  }

  @Post(':id/batch-grading/sessions/:sessionId/results')
  @ApiOperation({ summary: 'إضافة نتيجة تصحيح ناجحة' })
  async addBatchResult(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
    @Body() resultData: any,
  ) {
    return this.paperExamsService.addBatchGradingResult(sessionId, resultData);
  }

  @Post(':id/batch-grading/sessions/:sessionId/skipped')
  @ApiOperation({ summary: 'إضافة ورقة متجاهلة' })
  async addBatchSkipped(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
    @Body() skippedData: any,
  ) {
    return this.paperExamsService.addBatchGradingSkipped(sessionId, skippedData);
  }

  @Post(':id/batch-grading/sessions/:sessionId/already-graded')
  @ApiOperation({ summary: 'إضافة ورقة مصححة سابقاً' })
  async addBatchAlreadyGraded(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
    @Body() alreadyGradedData: any,
  ) {
    return this.paperExamsService.addBatchGradingAlreadyGraded(sessionId, alreadyGradedData);
  }

  @Post(':id/batch-grading/sessions/:sessionId/failures')
  @ApiOperation({ summary: 'إضافة حالة فشل' })
  async addBatchFailure(
    @Param('id', ParseIntPipe) examId: number,
    @Param('sessionId') sessionId: string,
    @Body() failureData: any,
  ) {
    return this.paperExamsService.addBatchGradingFailure(sessionId, failureData);
  }
}