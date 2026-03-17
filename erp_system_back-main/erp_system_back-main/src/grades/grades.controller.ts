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
  Req,
} from '@nestjs/common';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkUpdateGradesDto } from './dto/bulk-update-grades.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { UserProgramAccessService } from '../users/user-program-access.service';

@Controller('grades')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class GradesController {
  constructor(
    private readonly gradesService: GradesService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  // إنشاء أو تحديث درجة متدرب
  @Post()
  @RequirePermission('dashboard.grades', 'edit')
  async upsertGrade(@Body() createGradeDto: CreateGradeDto) {
    return this.gradesService.upsertGrade(createGradeDto);
  }

  // تحديث درجات بشكل جماعي
  @Post('bulk')
  async bulkUpdateGrades(@Body() bulkUpdateGradesDto: BulkUpdateGradesDto) {
    return this.gradesService.bulkUpdateGrades(bulkUpdateGradesDto);
  }

  // الحصول على قائمة المتدربين مع pagination
  @Get('trainees')
  @RequirePermission('dashboard.grades', 'view')
  async getTraineesForGrades(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('programId') programId?: string,
    @Req() req?: any,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const requestedProgramId = programId ? parseInt(programId, 10) : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, requestedProgramId);
    
    return this.gradesService.getTraineesForGrades(pageNum, limitNum, search, programFilter.programId as number | undefined);
  }

  // الحصول على درجات متدرب معين مع جميع المواد
  @Get('trainee/:traineeId')
  @RequirePermission('dashboard.grades', 'view')
  async getTraineeGrades(@Param('traineeId', ParseIntPipe) traineeId: number) {
    return this.gradesService.getTraineeGradesDetailed(traineeId);
  }

  // الحصول على درجات مادة تدريبية معينة
  @Get('content/:contentId')
  async getGradesByContent(
    @Param('contentId', ParseIntPipe) contentId: number,
    @Query('classroomId', ParseIntPipe) classroomId: number,
  ) {
    return this.gradesService.getGradesByContent(contentId, classroomId);
  }

  // حذف درجة متدرب
  @Delete(':id')
  @RequirePermission('dashboard.grades', 'edit')
  async deleteGrade(@Param('id', ParseIntPipe) id: number) {
    return this.gradesService.deleteGrade(id);
  }

  // الحصول على الأوائل
  @Get('top-students')
  @RequirePermission('dashboard.grades', 'view')
  async getTopStudents(
    @Query('programId') programId?: string,
    @Query('classroomId') classroomId?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const requestedProgramId = programId ? parseInt(programId, 10) : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, requestedProgramId);
    const classroomIdNum = classroomId ? parseInt(classroomId, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.gradesService.getTopStudents(programFilter.programId as number | undefined, classroomIdNum, limitNum);
  }

  // الحصول على الأوائل مجمعة حسب الفصول الدراسية
  @Get('top-students-by-classroom')
  @RequirePermission('dashboard.grades', 'view')
  async getTopStudentsByClassroom(
    @Query('programId') programId?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const requestedProgramId = programId ? parseInt(programId, 10) : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, requestedProgramId);
    const limitNum = limit ? parseInt(limit, 10) : 5;

    return this.gradesService.getTopStudentsByClassroom(programFilter.programId as number | undefined, limitNum);
  }

  // الحصول على طلاب الدور الثاني (مواد أقل من 50%)
  @Get('second-round')
  @RequirePermission('dashboard.grades.second-round', 'manage')
  async getSecondRoundStudents(
    @Query('programId') programId?: string,
    @Req() req?: any,
  ) {
    const requestedProgramId = programId ? parseInt(programId, 10) : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, requestedProgramId);
    return this.gradesService.getSecondRoundStudentsByClassroom(programFilter.programId as number | undefined);
  }

  // معاينة درجات الرأفة
  @Get('mercy-grades/preview')
  @RequirePermission('dashboard.grades.mercy', 'manage')
  async previewMercyGrades(
    @Query('classroomId', ParseIntPipe) classroomId: number,
    @Query('bonusPoints') bonusPoints: string,
    @Query('threshold') threshold?: string,
    @Query('contentIds') contentIds?: string,
    @Query('minThreshold') minThreshold?: string,
  ) {
    const bonus = parseFloat(bonusPoints);
    const thresh = threshold ? parseFloat(threshold) : 50;
    const ids = contentIds ? contentIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) : undefined;
    const minThresh = minThreshold ? parseFloat(minThreshold) : 0;
    return this.gradesService.previewMercyGrades(classroomId, bonus, thresh, ids, minThresh);
  }

  // تطبيق درجات الرأفة
  @Post('mercy-grades/apply')
  @RequirePermission('dashboard.grades.mercy', 'manage')
  async applyMercyGrades(
    @Body() body: { classroomId: number; bonusPoints: number; threshold?: number; contentIds?: number[]; minThreshold?: number },
  ) {
    const threshold = body.threshold || 50;
    const minThreshold = body.minThreshold ?? 0;
    return this.gradesService.applyMercyGrades(body.classroomId, body.bonusPoints, threshold, body.contentIds, minThreshold);
  }

  // معاينة تصفير مكون درجة
  @Get('reset-component/preview')
  @RequirePermission('dashboard.grades.reset-component', 'manage')
  async previewResetComponent(
    @Query('contentIds') contentIds: string,
    @Query('component') component: string,
    @Query('threshold') threshold?: string,
  ) {
    const ids = contentIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    const thresh = threshold ? parseFloat(threshold) : 10;
    return this.gradesService.previewResetComponent(ids, component, thresh);
  }

  // تطبيق تصفير مكون درجة
  @Post('reset-component/apply')
  @RequirePermission('dashboard.grades.reset-component', 'manage')
  async applyResetComponent(
    @Body() body: { contentIds: number[]; component: string; threshold?: number },
  ) {
    const threshold = body.threshold ?? 10;
    return this.gradesService.applyResetComponent(body.contentIds, body.component, threshold);
  }
}

