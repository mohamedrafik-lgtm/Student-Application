import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { TraineeJwtAuthGuard } from '../trainee-auth/guards/trainee-jwt-auth.guard';

@ApiTags('Quizzes')
@Controller('quizzes')
@SkipThrottle() // تخطي Rate Limiting للاختبارات - مهم للطلاب أثناء الامتحانات
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // ==================== إدارة الاختبارات (Dashboard) ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إنشاء اختبار جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الاختبار بنجاح' })
  create(@Body() createQuizDto: CreateQuizDto) {
    return this.quizzesService.create(createQuizDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على جميع الاختبارات' })
  @ApiResponse({ status: 200, description: 'قائمة الاختبارات' })
  findAll(@Query('contentId') contentId?: string, @Request() req?: any) {
    const contentIdNum = contentId ? parseInt(contentId, 10) : undefined;
    
    // إذا كان المستخدم محاضر، نجلب اختبارات مواده فقط
    const instructorId = req?.user?.accountType === 'INSTRUCTOR' ? req.user.userId : undefined;
    
    return this.quizzesService.findAll(contentIdNum, instructorId);
  }

  @Get('attempts/:attemptId/details')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على تفاصيل محاولة' })
  @ApiResponse({ status: 200, description: 'تفاصيل المحاولة' })
  getAttemptDetails(@Param('attemptId') attemptId: string) {
    return this.quizzesService.getAttemptDetails(attemptId);
  }

  @Get(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على تقرير الاختبار' })
  @ApiResponse({ status: 200, description: 'تقرير الاختبار' })
  getQuizReport(@Param('id') id: string) {
    return this.quizzesService.getQuizReport(+id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على اختبار معين' })
  @ApiResponse({ status: 200, description: 'تفاصيل الاختبار' })
  findOne(@Param('id') id: string) {
    return this.quizzesService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث اختبار' })
  @ApiResponse({ status: 200, description: 'تم تحديث الاختبار بنجاح' })
  update(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizzesService.update(+id, updateQuizDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف اختبار' })
  @ApiResponse({ status: 200, description: 'تم حذف الاختبار بنجاح' })
  remove(@Param('id') id: string) {
    return this.quizzesService.remove(+id);
  }

  // ==================== اختبارات المتدربين (Trainee Dashboard) ====================

  @Get('trainee/available')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على الاختبارات المتاحة للمتدرب' })
  @ApiResponse({ status: 200, description: 'قائمة الاختبارات المتاحة' })
  getAvailableQuizzes(@Request() req) {
    return this.quizzesService.getAvailableQuizzes(req.user.traineeId);
  }

  @Post('trainee/start')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بدء محاولة اختبار' })
  @ApiResponse({ status: 201, description: 'تم بدء المحاولة بنجاح' })
  startQuiz(@Request() req, @Body() startQuizDto: StartQuizDto) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.quizzesService.startQuiz(req.user.traineeId, startQuizDto, ipAddress, userAgent);
  }

  @Post('trainee/answer')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تسليم إجابة سؤال' })
  @ApiResponse({ status: 200, description: 'تم حفظ الإجابة بنجاح' })
  submitAnswer(@Request() req, @Body() submitAnswerDto: SubmitAnswerDto) {
    return this.quizzesService.submitAnswer(req.user.traineeId, submitAnswerDto);
  }

  @Post('trainee/submit')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تسليم الاختبار' })
  @ApiResponse({ status: 200, description: 'تم تسليم الاختبار بنجاح' })
  submitQuiz(@Request() req, @Body() submitQuizDto: SubmitQuizDto) {
    return this.quizzesService.submitQuiz(req.user.traineeId, submitQuizDto);
  }

  @Get('trainee/attempt/:id/result')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على نتيجة محاولة' })
  @ApiResponse({ status: 200, description: 'نتيجة المحاولة' })
  getAttemptResult(@Request() req, @Param('id') id: string) {
    return this.quizzesService.getAttemptResult(req.user.traineeId, id);
  }
}

