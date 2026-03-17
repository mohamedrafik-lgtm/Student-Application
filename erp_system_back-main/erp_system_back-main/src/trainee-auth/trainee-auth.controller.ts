import { Controller, Post, UseGuards, Request, Get, HttpStatus, Body, Headers, Query, Inject, forwardRef } from '@nestjs/common';
import { TraineeAuthService } from './trainee-auth.service';
import { TraineeLocalAuthGuard } from './guards/trainee-local-auth.guard';
import { TraineeJwtAuthGuard } from './guards/trainee-jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiHeader } from '@nestjs/swagger';
import { TraineeLoginDto } from './dto/trainee-login.dto';
import { VerifyTraineeDto } from './dto/verify-trainee.dto';
import { CreatePasswordDto } from './dto/create-password.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AttendanceService } from '../attendance/attendance.service';

@ApiTags('trainee-auth')
@Controller('trainee-auth')
export class TraineeAuthController {
  constructor(
    private traineeAuthService: TraineeAuthService,
    @Inject(forwardRef(() => AttendanceService))
    private attendanceService: AttendanceService,
  ) {}

  @Post('check-national-id')
  @ApiOperation({ summary: 'التحقق من وجود المتدرب بالرقم القومي' })
  @ApiBody({
    schema: {
      properties: {
        nationalId: { type: 'string', example: '12345678901234' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم العثور على المتدرب',
    schema: {
      properties: {
        exists: { type: 'boolean', example: true },
        hasAccount: { type: 'boolean', example: false },
        name: { type: 'string', example: 'أحمد محمد' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'أنت غير مسجل في قاعدة بيانات المركز',
  })
  async checkNationalId(@Body() body: { nationalId: string }) {
    return this.traineeAuthService.checkNationalId(body.nationalId);
  }

  @Post('verify-trainee')
  @ApiOperation({ summary: 'التحقق من بيانات المتدرب للتسجيل' })
  @ApiBody({ type: VerifyTraineeDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم التحقق من بيانات المتدرب بنجاح',
    schema: {
      properties: {
        traineeId: { type: 'number', example: 1 },
        nationalId: { type: 'string', example: '12345678901234' },
        name: { type: 'string', example: 'أحمد محمد' },
        hasAccount: { type: 'boolean', example: false }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'لا يوجد متدرب بهذه البيانات' 
  })
  async verifyTrainee(@Body() verifyTraineeDto: VerifyTraineeDto) {
    return this.traineeAuthService.verifyTraineeForRegistration(
      verifyTraineeDto.nationalId, 
      verifyTraineeDto.birthDate
    );
  }

  @Post('verify-phone')
  @ApiOperation({ summary: 'التحقق من رقم الهاتف للمتدرب' })
  @ApiBody({ 
    schema: {
      properties: {
        nationalId: { type: 'string', example: '12345678901234' },
        phone: { type: 'string', example: '01234567890' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم التحقق من رقم الهاتف بنجاح',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم التحقق من رقم الهاتف بنجاح' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'رقم الهاتف غير متطابق مع السجلات' 
  })
  async verifyPhone(@Body() body: { nationalId: string; phone: string }) {
    return this.traineeAuthService.verifyTraineePhone(body.nationalId, body.phone);
  }

  @Post('create-password')
  @ApiOperation({ summary: 'إنشاء كلمة مرور للمتدرب' })
  @ApiBody({ type: CreatePasswordDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم إنشاء كلمة المرور بنجاح',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم إنشاء كلمة المرور بنجاح' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'بيانات المتدرب غير صحيحة' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'يوجد حساب مسجل مسبقاً' 
  })
  async createPassword(@Body() createPasswordDto: CreatePasswordDto) {
    return this.traineeAuthService.createTraineePassword(
      createPasswordDto.nationalId,
      createPasswordDto.birthDate,
      createPasswordDto.password
    );
  }

  @UseGuards(TraineeLocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'تسجيل دخول المتدرب' })
  @ApiBody({ type: TraineeLoginDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم تسجيل الدخول بنجاح',
    schema: {
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        trainee: {
          type: 'object',
          description: 'بيانات المتدرب'
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'بيانات تسجيل الدخول غير صحيحة' 
  })
  async login(@Request() req) {
    return this.traineeAuthService.login(req.user, req);
  }

  @UseGuards(TraineeJwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على بيانات المتدرب' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم الحصول على بيانات المتدرب بنجاح'
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'غير مصرح' 
  })
  getProfile(@Request() req) {
    return this.traineeAuthService.getProfile(req.user.userId);
  }

  @UseGuards(TraineeJwtAuthGuard)
  @Get('my-schedule')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على الجدول الدراسي الأسبوعي للمتدرب' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم الحصول على الجدول الدراسي بنجاح'
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'غير مصرح' 
  })
  getMySchedule(@Request() req) {
    return this.traineeAuthService.getMySchedule(req.user.traineeId);
  }

  @Post('request-password-reset')
  @ApiOperation({ summary: 'طلب إعادة تعيين كلمة المرور' })
  @ApiBody({ 
    schema: {
      properties: {
        nationalId: { type: 'string', example: '12345678901234' },
        phone: { type: 'string', example: '01234567890' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم إرسال كود إعادة تعيين كلمة المرور بنجاح',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم إرسال كود إعادة تعيين كلمة المرور عبر الواتساب' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'لا يوجد حساب مرتبط بهذا الرقم القومي أو رقم الهاتف غير متطابق' 
  })
  async requestPasswordReset(@Body() body: { nationalId: string; phone: string }) {
    return this.traineeAuthService.requestPasswordReset(body.nationalId, body.phone);
  }

  @Post('verify-reset-code')
  @ApiOperation({ summary: 'التحقق من كود إعادة تعيين كلمة المرور' })
  @ApiBody({ type: VerifyResetCodeDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'كود التحقق صحيح',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'كود التحقق صحيح' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'كود التحقق غير صحيح أو منتهي الصلاحية' 
  })
  async verifyResetCode(@Body() verifyResetCodeDto: VerifyResetCodeDto) {
    return this.traineeAuthService.verifyResetCode(
      verifyResetCodeDto.nationalId, 
      verifyResetCodeDto.resetCode
    );
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'إعادة تعيين كلمة المرور' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم تغيير كلمة المرور بنجاح',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'تم تغيير كلمة المرور بنجاح' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'كود التحقق غير صحيح أو منتهي الصلاحية' 
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.traineeAuthService.resetPassword(
      resetPasswordDto.nationalId,
      resetPasswordDto.resetCode,
      resetPasswordDto.newPassword
    );
  }

  @Post('logout')
  @ApiOperation({ summary: 'تسجيل الخروج من المنصة' })
  @ApiHeader({ name: 'x-session-token', description: 'Session token' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم تسجيل الخروج بنجاح' 
  })
  async logout(@Headers('x-session-token') sessionToken: string) {
    return this.traineeAuthService.logout(sessionToken);
  }

  @Post('track-activity')
  @ApiOperation({ summary: 'تسجيل نشاط المتدرب' })
  @ApiHeader({ name: 'x-session-token', description: 'Session token' })
  @ApiBody({
    schema: {
      properties: {
        activityType: { type: 'string', example: 'PAGE_VIEW' },
        page: { type: 'string', example: '/dashboard' },
        action: { type: 'string', example: 'view_content' },
        metadata: { type: 'object', example: { duration: 120 } }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم تسجيل النشاط بنجاح' 
  })
  async trackActivity(
    @Headers('x-session-token') sessionToken: string,
    @Body() body: {
      activityType: string;
      page?: string;
      action?: string;
      metadata?: any;
    }
  ) {
    return this.traineeAuthService.trackActivity(
      sessionToken,
      body.activityType,
      body.page,
      body.action,
      body.metadata
    );
  }

  @UseGuards(TraineeJwtAuthGuard)
  @Get('advanced-stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إحصائيات متقدمة للمتدرب' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'إحصائيات المتدرب المتقدمة' 
  })
  async getAdvancedStats(@Request() req) {
    return this.traineeAuthService.getAdvancedStats(req.user.sub);
  }

  @UseGuards(TraineeJwtAuthGuard)
  @Get('attendance-records')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب سجلات الحضور والغياب للمتدرب' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'سجلات الحضور والغياب منظمة حسب الفصل والمادة' 
  })
  async getMyAttendanceRecords(@Request() req) {
    return this.traineeAuthService.getMyAttendanceRecords(req.user.traineeId);
  }

  @UseGuards(TraineeJwtAuthGuard)
  @Get('my-grades')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب درجات المتدرب' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'درجات المتدرب منظمة حسب الفصل والمادة' 
  })
  async getMyGrades(@Request() req) {
    return this.traineeAuthService.getMyGrades(req.user.traineeId);
  }

  @Post('heartbeat')
  @ApiOperation({ summary: 'إرسال نبضة للحفاظ على الجلسة نشطة' })
  @ApiHeader({ name: 'x-session-token', description: 'Session token' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'تم تحديث نشاط الجلسة' 
  })
  async heartbeat(@Headers('x-session-token') sessionToken: string) {
    return this.traineeAuthService.updateSessionActivity(sessionToken);
  }

  @UseGuards(TraineeJwtAuthGuard)
  @Post('verify-attendance-code')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تسجيل حضور المتدرب عبر كود الحضور' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم تسجيل الحضور بنجاح'
  })
  async verifyAttendanceCode(@Request() req, @Body() body: { code: string }) {
    return this.attendanceService.verifyAttendanceCode(body.code, req.user.traineeId);
  }
}
