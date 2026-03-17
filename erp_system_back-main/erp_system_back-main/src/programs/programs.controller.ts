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
} from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { UpdateClassroomsDto } from './dto/update-classrooms.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('programs')
@Controller('programs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProgramsController {
  constructor(
    private readonly programsService: ProgramsService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء برنامج تدريبي جديد' })
  @ApiBody({ type: CreateProgramDto })
  @ApiResponse({ status: 201, description: 'تم إنشاء البرنامج بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  create(@Body() createProgramDto: CreateProgramDto, @Request() req) {
    return this.programsService.create(createProgramDto, req.user.userId);
  }

  @Get('stats')
  // الإحصائيات العامة متاحة (تُستخدم في لوحة التحكم)
  @ApiOperation({ summary: 'الحصول على إحصائيات البرامج التدريبية' })
  @ApiResponse({ status: 200, description: 'إحصائيات البرامج التدريبية' })
  async getStats(@Request() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.programsService.getStats(allowedProgramIds.length > 0 ? allowedProgramIds : undefined);
  }

  @Get()
  // البرامج متاحة للجميع للقراءة (تُستخدم في التصفية والمراجع)
  @ApiOperation({ summary: 'الحصول على جميع البرامج التدريبية' })
  @ApiResponse({ status: 200, description: 'قائمة البرامج التدريبية' })
  async findAll(@Request() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.programsService.findAll(allowedProgramIds.length > 0 ? allowedProgramIds : undefined);
  }

  @Get(':id')
  // البرامج متاحة للجميع للقراءة (تُستخدم في عرض تفاصيل المتدربين)
  @ApiOperation({ summary: 'الحصول على برنامج تدريبي بواسطة المعرف' })
  @ApiParam({ name: 'id', description: 'معرف البرنامج التدريبي' })
  @ApiResponse({ status: 200, description: 'بيانات البرنامج التدريبي' })
  @ApiResponse({ status: 404, description: 'البرنامج التدريبي غير موجود' })
  findOne(@Param('id') id: string) {
    return this.programsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث بيانات برنامج تدريبي' })
  @ApiParam({ name: 'id', description: 'معرف البرنامج التدريبي' })
  @ApiBody({ type: UpdateProgramDto })
  @ApiResponse({ status: 200, description: 'تم تحديث البرنامج التدريبي بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 404, description: 'البرنامج التدريبي غير موجود' })
  update(
    @Param('id') id: string,
    @Body() updateProgramDto: UpdateProgramDto,
    @Request() req,
  ) {
    return this.programsService.update(+id, updateProgramDto, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف برنامج تدريبي' })
  @ApiParam({ name: 'id', description: 'معرف البرنامج التدريبي' })
  @ApiResponse({ status: 200, description: 'تم حذف البرنامج التدريبي بنجاح' })
  @ApiResponse({ status: 404, description: 'البرنامج التدريبي غير موجود' })
  remove(@Param('id') id: string, @Request() req) {
    return this.programsService.remove(+id, req.user.userId);
  }

  @Patch(':id/classrooms')
  @ApiOperation({ summary: 'تحديث عدد الفصول الدراسية' })
  @ApiParam({ name: 'id', description: 'معرف البرنامج التدريبي' })
  @ApiBody({ type: UpdateClassroomsDto })
  @ApiResponse({ status: 200, description: 'تم تحديث عدد الفصول بنجاح' })
  @ApiResponse({ status: 404, description: 'البرنامج التدريبي غير موجود' })
  updateClassrooms(
    @Param('id') id: string,
    @Body() updateClassroomsDto: UpdateClassroomsDto,
  ) {
    return this.programsService.updateClassrooms(+id, updateClassroomsDto.numberOfClassrooms);
  }

  @Patch('classrooms/:classroomId')
  @ApiOperation({ summary: 'تحديث بيانات فصل دراسي' })
  @ApiParam({ name: 'classroomId', description: 'معرف الفصل' })
  updateSingleClassroom(
    @Param('classroomId') classroomId: string,
    @Body() updateDto: { name?: string; startDate?: string; endDate?: string },
  ) {
    return this.programsService.updateSingleClassroom(+classroomId, updateDto);
  }

  @Get('classroom/:classroomId')
  @ApiOperation({ summary: 'الحصول على تفاصيل فصل دراسي واحد' })
  @ApiParam({ name: 'classroomId', description: 'معرف الفصل' })
  getClassroom(@Param('classroomId') classroomId: string) {
    return this.programsService.findClassroom(+classroomId);
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'الحصول على تقرير شامل للبرنامج' })
  @ApiParam({ name: 'id', description: 'معرف البرنامج التدريبي' })
  @ApiResponse({ status: 200, description: 'تقرير البرنامج الشامل' })
  @ApiResponse({ status: 404, description: 'البرنامج التدريبي غير موجود' })
  getProgramReport(@Param('id') id: string) {
    return this.programsService.getProgramReport(+id);
  }
}