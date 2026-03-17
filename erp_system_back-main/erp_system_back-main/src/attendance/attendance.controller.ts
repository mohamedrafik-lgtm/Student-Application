import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  Patch,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { BulkRecordAttendanceDto } from './dto/bulk-record-attendance.dto';
import { TraineeAttendanceQueryDto } from './dto/trainee-attendance-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly prisma: PrismaService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  @Post('record')
  @ApiOperation({ summary: 'تسجيل حضور متدرب واحد' })
  recordAttendance(@Body() dto: RecordAttendanceDto, @Req() req: any) {
    return this.attendanceService.recordAttendance(dto, req.user.userId);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'تسجيل حضور جماعي' })
  bulkRecordAttendance(@Body() dto: BulkRecordAttendanceDto, @Req() req: any) {
    return this.attendanceService.bulkRecordAttendance(
      dto.sessionId,
      dto.records,
      req.user.userId
    );
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'الحصول على سجلات الحضور لمحاضرة معينة' })
  @ApiParam({ name: 'sessionId', description: 'معرف المحاضرة' })
  getSessionAttendance(@Param('sessionId') sessionId: string) {
    return this.attendanceService.getSessionAttendance(+sessionId);
  }

  @Get('session/:sessionId/expected-trainees')
  @ApiOperation({ summary: 'الحصول على قائمة المتدربين المفترض حضورهم' })
  @ApiParam({ name: 'sessionId', description: 'معرف المحاضرة' })
  getExpectedTrainees(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.attendanceService.getExpectedTrainees(+sessionId, req.user.userId);
  }

  @Get('session/:sessionId/stats')
  @ApiOperation({ summary: 'إحصائيات الحضور لمحاضرة معينة' })
  @ApiParam({ name: 'sessionId', description: 'معرف المحاضرة' })
  getSessionStats(@Param('sessionId') sessionId: string) {
    return this.attendanceService.getSessionAttendanceStats(+sessionId);
  }

  @Get('trainee/:traineeId/content/:contentId')
  @ApiOperation({ summary: 'إحصائيات حضور متدرب في مادة معينة' })
  @ApiParam({ name: 'traineeId', description: 'معرف المتدرب' })
  @ApiParam({ name: 'contentId', description: 'معرف المادة' })
  getTraineeStats(
    @Param('traineeId') traineeId: string,
    @Param('contentId') contentId: string
  ) {
    return this.attendanceService.getTraineeAttendanceStats(
      +traineeId,
      +contentId
    );
  }

  @Get('my-sessions')
  @ApiOperation({ summary: 'الحصول على المحاضرات التي يمكنني رصد حضورها' })
  getMySessions(@Req() req: any) {
    return this.attendanceService.getMySessions(req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف سجل حضور' })
  @ApiParam({ name: 'id', description: 'معرف سجل الحضور' })
  deleteAttendance(@Param('id') id: string) {
    return this.attendanceService.deleteAttendance(id);
  }

  @Get('trainees')
  @ApiOperation({ summary: 'استعراض قائمة المتدربين مع سجلات الحضور' })
  async getTraineesWithAttendance(@Query() query: TraineeAttendanceQueryDto, @Req() req: any) {
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, query.programId ? Number(query.programId) : undefined);
    if (programFilter.programId) {
      query.programId = programFilter.programId as any;
    }
    return this.attendanceService.getTraineesWithAttendance(query);
  }

  @Get('trainee/:traineeId')
  @ApiOperation({ summary: 'عرض سجل حضور متدرب معين' })
  @ApiParam({ name: 'traineeId', description: 'معرف المتدرب' })
  getTraineeAttendanceDetails(@Param('traineeId') traineeId: string) {
    return this.attendanceService.getTraineeAttendanceDetails(+traineeId);
  }

  @Post('recalculate-grades')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.attendance-grades', 'manage')
  @ApiOperation({ summary: 'إعادة حساب درجات الحضور لجميع المتدربين' })
  recalculateAllAttendanceGrades() {
    return this.attendanceService.recalculateAllAttendanceGrades();
  }

  @Get('classrooms-with-schedule')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.attendance-grades', 'manage')
  @ApiOperation({ summary: 'جلب الفصول الدراسية التي لديها جدول حضور' })
  async getClassroomsWithSchedule() {
    const classrooms = await this.prisma.classroom.findMany({
      where: {
        scheduleSlots: { some: {} },
      },
      include: {
        program: { select: { nameAr: true } },
        trainingContents: { select: { id: true, name: true } },
        _count: { select: { scheduleSlots: true } },
      },
      orderBy: [{ programId: 'asc' }, { classNumber: 'asc' }],
    });
    return classrooms;
  }

  @Post('unify-attendance/:classroomId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.attendance-grades', 'manage')
  @ApiOperation({ summary: 'توحيد الحضور عبر المواد في نفس اليوم بالفصل الدراسي' })
  @ApiParam({ name: 'classroomId', description: 'معرف الفصل الدراسي' })
  unifyAttendance(@Param('classroomId') classroomId: string, @Req() req: any) {
    return this.attendanceService.unifyAttendanceByClassroom(+classroomId, req.user.userId);
  }

  @Post('cleanup-phantom-records/:classroomId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.attendance-grades', 'manage')
  @ApiOperation({ summary: 'تنظيف سجلات الحضور الوهمية - حذف سجلات متدربين في جلسات ليست مجموعتهم' })
  @ApiParam({ name: 'classroomId', description: 'معرف الفصل الدراسي' })
  cleanupPhantomRecords(@Param('classroomId') classroomId: string) {
    return this.attendanceService.cleanupPhantomAttendanceRecords(+classroomId);
  }

  // ================== أكواد تسجيل الحضور ==================

  @Post('session/:sessionId/generate-code')
  @ApiOperation({ summary: 'إنشاء كود حضور من 6 أرقام لمحاضرة' })
  @ApiParam({ name: 'sessionId', description: 'معرف المحاضرة' })
  generateAttendanceCode(
    @Param('sessionId') sessionId: string,
    @Body() body: { expiresInMinutes?: number },
    @Req() req: any,
  ) {
    return this.attendanceService.generateAttendanceCode(+sessionId, req.user.userId, body.expiresInMinutes);
  }

  @Get('session/:sessionId/code')
  @ApiOperation({ summary: 'الحصول على الكود النشط لمحاضرة' })
  @ApiParam({ name: 'sessionId', description: 'معرف المحاضرة' })
  getAttendanceCode(@Param('sessionId') sessionId: string) {
    return this.attendanceService.getAttendanceCode(+sessionId);
  }

  @Patch('session/:sessionId/deactivate-code')
  @ApiOperation({ summary: 'تعطيل كود حضور محاضرة' })
  @ApiParam({ name: 'sessionId', description: 'معرف المحاضرة' })
  deactivateAttendanceCode(@Param('sessionId') sessionId: string) {
    return this.attendanceService.deactivateAttendanceCode(+sessionId);
  }
}
