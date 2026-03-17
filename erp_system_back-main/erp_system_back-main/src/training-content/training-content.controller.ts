import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { TrainingContentService } from './training-content.service';
import { CreateTrainingContentDto } from './dto/create-training-content.dto';
import { UpdateTrainingContentDto } from './dto/update-training-content.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserProgramAccessService } from '../users/user-program-access.service';

@Controller('training-contents')
@UseGuards(JwtAuthGuard)
export class TrainingContentController {
  constructor(
    private readonly trainingContentService: TrainingContentService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  @Post()

  create(@Body() createTrainingContentDto: CreateTrainingContentDto, @Req() req) {
    return this.trainingContentService.create(createTrainingContentDto, req.user.userId);
  }

  @Get('generate-code')

  generateUniqueCode() {
    return this.trainingContentService.generateUniqueCode();
  }

  @Get('my-courses')
  findMyCourses(@Req() req) {
    return this.trainingContentService.findByInstructor(req.user.userId);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('includeQuestionCount') includeQuestionCount?: string,
    @Query('classroomId') classroomId?: string,
    @Query('instructorId') instructorId?: string,
    @Query('programId') programId?: string,
  ) {
    const shouldIncludeCount = includeQuestionCount === 'true';
    
    console.log('Training Contents Request - User:', req.user);
    console.log('Training Contents Request - Account Type:', req.user?.accountType);
    
    // إذا كان المستخدم محاضر، نجلب مواده فقط
    if (req.user && req.user.accountType === 'INSTRUCTOR') {
      console.log('Fetching instructor courses for:', req.user.userId);
      return this.trainingContentService.findByInstructor(req.user.userId);
    }
    
    // إذا تم تحديد instructorId، نجلب مواد المحاضر
    if (instructorId) {
      return this.trainingContentService.findByInstructor(instructorId);
    }
    
    // تطبيق فلتر البرامج المسموحة
    const requestedProgramId = programId ? +programId : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, requestedProgramId);
    const filteredProgramId = programFilter.programId as number | undefined;
    
    return this.trainingContentService.findAll(
      shouldIncludeCount,
      classroomId ? +classroomId : undefined,
      filteredProgramId
    );
  }

  // ⚠️ الروتات المحددة يجب أن تكون قبل :id العام
  @Get(':id/lectures')
  findLectures(@Param('id') id: string) {
    return this.trainingContentService.findLectures(+id);
  }

  @Get(':id/questions')
  findQuestions(@Param('id') id: string) {
    return this.trainingContentService.findQuestions(+id);
  }

  @Get(':id/trainees')
  findTrainees(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.trainingContentService.findTraineesWithPagination(
      +id,
      page ? +page : 1,
      limit ? +limit : 20,
      search
    );
  }

  @Get(':id/attendance')
  findAttendance(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.trainingContentService.findAttendanceByContent(+id, pageNum, limitNum, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('includeQuestionCount') includeQuestionCount?: string) {
    const shouldIncludeCount = includeQuestionCount === 'true';
    return this.trainingContentService.findOne(+id, shouldIncludeCount);
  }

  @Patch(':id')

  update(@Param('id') id: string, @Body() updateTrainingContentDto: UpdateTrainingContentDto, @Req() req) {
    return this.trainingContentService.update(+id, updateTrainingContentDto, req.user.userId);
  }

  @Delete(':id')

  remove(@Param('id') id: string, @Req() req) {
    return this.trainingContentService.remove(+id, req.user.userId);
  }
} 