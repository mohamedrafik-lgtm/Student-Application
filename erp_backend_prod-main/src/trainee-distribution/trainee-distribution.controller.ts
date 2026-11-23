import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TraineeDistributionService } from './trainee-distribution.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionDto } from './dto/update-distribution.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserProgramAccessService } from '../users/user-program-access.service';
import { UserDistributionAccessService } from '../users/user-distribution-access.service';

@ApiTags('trainee-distribution')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trainee-distribution')
export class TraineeDistributionController {
  constructor(
    private readonly traineeDistributionService: TraineeDistributionService,
    private readonly userProgramAccessService: UserProgramAccessService,
    private readonly userDistributionAccessService: UserDistributionAccessService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء توزيع جديد للمتدربين' })
  create(@Body() createDistributionDto: CreateDistributionDto, @Request() req) {
    return this.traineeDistributionService.create(
      createDistributionDto,
      req.user.userId,
    );
  }

  @Get('undistributed/trainees')
  @ApiOperation({ summary: 'جلب المتدربين الغير موزعين' })
  @ApiQuery({ name: 'programId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getUndistributedTrainees(
    @Query('programId') programId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?,
  ) {
    const filters: any = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    };
    if (programId) filters.programId = parseInt(programId);
    if (type) filters.type = type;
    if (search) filters.search = search;

    // تطبيق فلتر البرامج المسموحة
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req?.user?.userId, filters.programId);
    if (programFilter.programId) filters.programId = programFilter.programId;

    return this.traineeDistributionService.getUndistributedTrainees(filters);
  }

  @Get()
  @ApiOperation({ summary: 'جلب جميع التوزيعات' })
  @ApiQuery({ name: 'programId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'classroomId', required: false })
  async findAll(
    @Query('programId') programId?: string,
    @Query('type') type?: string,
    @Query('academicYear') academicYear?: string,
    @Query('classroomId') classroomId?: string,
    @Request() req?,
  ) {
    const filters: any = {};
    if (programId) filters.programId = parseInt(programId);
    if (type) filters.type = type;
    if (academicYear) filters.academicYear = academicYear;
    if (classroomId !== undefined && classroomId !== '') filters.classroomId = parseInt(classroomId);

    // تطبيق فلتر البرامج المسموحة
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req?.user?.userId, filters.programId);
    if (programFilter.programId) filters.programId = programFilter.programId;

    const results = await this.traineeDistributionService.findAll(filters);

    // تطبيق فلتر التوزيعات المسموحة
    const userId = req?.user?.userId;
    const allowedDistIds = await this.userDistributionAccessService.getAllowedDistributionIds(userId);
    let filteredResults = allowedDistIds.length > 0
      ? results.filter((d: any) => allowedDistIds.includes(d.id))
      : results;

    // تطبيق فلتر المجموعات (الغرف) المسموحة - لكل توزيعة على حدة
    filteredResults = await this.userDistributionAccessService.filterDistributionRooms(userId, filteredResults);

    return filteredResults;
  }

  @Get('active/:programId')
  @ApiOperation({ summary: 'جلب التوزيعات المفعلة/النشطة حسب تاريخ الفصل الدراسي' })
  async getActiveDistributions(@Param('programId') programId: string, @Request() req) {
    const userId = req.user.userId;
    await this.userProgramAccessService.applyProgramFilter(userId, parseInt(programId));
    let results = await this.traineeDistributionService.getActiveDistributions(parseInt(programId));

    // تطبيق فلتر التوزيعات المسموحة
    const allowedDistIds = await this.userDistributionAccessService.getAllowedDistributionIds(userId);
    if (allowedDistIds.length > 0) {
      results = results.filter((d: any) => allowedDistIds.includes(d.id));
    }

    // تطبيق فلتر المجموعات المسموحة - لكل توزيعة على حدة
    results = await this.userDistributionAccessService.filterDistributionRooms(userId, results);

    return results;
  }

  @Get(':id')
  @ApiOperation({ summary: 'جلب توزيع محدد' })
  async findOne(@Param('id') id: string, @Request() req) {
    const result = await this.traineeDistributionService.findOne(id);

    // تطبيق فلتر المجموعات المسموحة - لكل توزيعة على حدة
    const userId = req?.user?.userId;
    if (userId && result) {
      const filtered = await this.userDistributionAccessService.filterDistributionRooms(userId, [result]);
      if (filtered[0]?.rooms) {
        result.rooms = filtered[0].rooms;
      }
    }

    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث توزيع' })
  update(
    @Param('id') id: string,
    @Body() updateDistributionDto: UpdateDistributionDto,
    @Request() req,
  ) {
    return this.traineeDistributionService.update(
      id,
      updateDistributionDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف توزيع' })
  remove(@Param('id') id: string) {
    return this.traineeDistributionService.remove(id);
  }

  @Post('assignment')
  @ApiOperation({ summary: 'إضافة متدرب إلى مجموعة لأول مرة' })
  createAssignment(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.traineeDistributionService.createAssignment(createAssignmentDto);
  }

  @Patch('assignment/:assignmentId')
  @ApiOperation({ summary: 'تحديث تخصيص متدرب (نقله إلى مجموعة أخرى)' })
  updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
  ) {
    return this.traineeDistributionService.updateAssignment(
      assignmentId,
      updateAssignmentDto,
    );
  }

  @Post(':id/redistribute')
  @ApiOperation({ summary: 'إعادة توزيع المتدربين تلقائياً' })
  redistribute(@Param('id') id: string) {
    return this.traineeDistributionService.redistribute(id);
  }

  @Post(':id/copy')
  @ApiOperation({ summary: 'نسخ توزيعة إلى فصل دراسي آخر' })
  copyDistribution(
    @Param('id') id: string,
    @Body('classroomId') classroomId: number,
    @Request() req,
  ) {
    return this.traineeDistributionService.copyDistribution(id, classroomId, req.user.userId);
  }

  @Patch('room/:roomId')
  @ApiOperation({ summary: 'تحديث اسم مجموعة' })
  updateRoomName(
    @Param('roomId') roomId: string,
    @Body('roomName') roomName: string,
  ) {
    return this.traineeDistributionService.updateRoomName(roomId, roomName);
  }

  @Patch('room/:roomId/capacity')
  @ApiOperation({ summary: 'تحديث سعة مجموعة (لتوزيعات التسجيل الذاتي فقط)' })
  updateRoomCapacity(
    @Param('roomId') roomId: string,
    @Body('capacity') capacity: number,
  ) {
    return this.traineeDistributionService.updateRoomCapacity(roomId, Number(capacity));
  }
}
