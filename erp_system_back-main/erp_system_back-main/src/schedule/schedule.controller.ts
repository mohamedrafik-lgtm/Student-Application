import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleSlotDto } from './dto/create-schedule-slot.dto';
import { UpdateScheduleSlotDto } from './dto/update-schedule-slot.dto';
import { CancelSessionDto } from './dto/update-session-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('schedule')
@ApiBearerAuth()
@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post('slots')
  @ApiOperation({ summary: 'إنشاء فترة في الجدول الدراسي' })
  create(@Body() createSlotDto: CreateScheduleSlotDto) {
    return this.scheduleService.createSlot(createSlotDto);
  }

  @Get('classroom/:classroomId')
  @ApiOperation({ summary: 'الحصول على جميع فترات الجدول لفصل معين' })
  findAllByClassroom(@Param('classroomId') classroomId: string) {
    return this.scheduleService.findAllByClassroom(+classroomId);
  }

  @Get('classroom/:classroomId/weekly')
  @ApiOperation({ summary: 'الحصول على الجدول الأسبوعي' })
  getWeeklySchedule(@Param('classroomId') classroomId: string) {
    return this.scheduleService.getWeeklySchedule(+classroomId);
  }

  @Get('slots/:id')
  @ApiOperation({ summary: 'الحصول على فترة واحدة' })
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(+id);
  }

  @Patch('slots/:id')
  @ApiOperation({ summary: 'تحديث فترة في الجدول' })
  update(@Param('id') id: string, @Body() updateSlotDto: UpdateScheduleSlotDto) {
    return this.scheduleService.update(+id, updateSlotDto);
  }

  @Delete('slots/:id')
  @ApiOperation({ summary: 'حذف فترة من الجدول' })
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(+id);
  }

  @Get('slots/:id/sessions')
  @ApiOperation({ summary: 'الحصول على جميع الجلسات لفترة معينة' })
  findSessionsBySlot(@Param('id') id: string) {
    return this.scheduleService.findSessionsBySlot(+id);
  }

  @Patch('sessions/:id/cancel')
  @ApiOperation({ summary: 'إلغاء/تفعيل محاضرة' })
  cancelSession(
    @Param('id') id: string,
    @Body() cancelDto: CancelSessionDto,
  ) {
    return this.scheduleService.cancelSession(+id, cancelDto);
  }

  @Post('slots/:id/regenerate')
  @ApiOperation({ summary: 'إعادة توليد الجلسات لفترة معينة' })
  async regenerateSessions(@Param('id') id: string) {
    const count = await this.scheduleService.generateSessionsForSlot(+id);
    return { message: `تم توليد ${count} جلسة بنجاح` };
  }

  @Get('content/:contentId/distribution-rooms')
  @ApiOperation({ summary: 'الحصول على المجموعات المتاحة لمادة ونوع معين' })
  getDistributionRooms(
    @Param('contentId') contentId: string,
    @Query('type') type: 'THEORY' | 'PRACTICAL',
    @Query('classroomId') classroomId?: string,
  ) {
    return this.scheduleService.getDistributionRooms(+contentId, type, classroomId ? +classroomId : undefined);
  }
}

