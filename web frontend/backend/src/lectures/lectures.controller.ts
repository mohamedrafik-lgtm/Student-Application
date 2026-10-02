import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ParseIntPipe, Query } from '@nestjs/common';
import { LecturesService } from './lectures.service';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('lectures')
@Controller('lectures')
export class LecturesController {
  constructor(private readonly lecturesService: LecturesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إنشاء محاضرة جديدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المحاضرة بنجاح' })
  create(@Body() createLectureDto: CreateLectureDto, @Req() req) {
    return this.lecturesService.create(createLectureDto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على جميع المحاضرات' })
  @ApiResponse({ status: 200, description: 'تم استرجاع المحاضرات بنجاح' })
  findAll() {
    return this.lecturesService.findAll();
  }

  @Get('content/:contentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على محاضرات محتوى تدريبي معين' })
  @ApiResponse({ status: 200, description: 'تم استرجاع محاضرات المحتوى التدريبي بنجاح' })
  findByContentId(@Param('contentId') contentId: string) {
    return this.lecturesService.findByContentId(Number(contentId));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على محاضرة معينة' })
  @ApiResponse({ status: 200, description: 'تم استرجاع المحاضرة بنجاح' })
  findOne(@Param('id') id: string) {
    return this.lecturesService.findOne(Number(id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث محاضرة' })
  @ApiResponse({ status: 200, description: 'تم تحديث المحاضرة بنجاح' })
  update(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureDto,
    @Req() req,
  ) {
    return this.lecturesService.update(Number(id), updateLectureDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف محاضرة' })
  @ApiResponse({ status: 200, description: 'تم حذف المحاضرة بنجاح' })
  remove(@Param('id') id: string, @Req() req) {
    return this.lecturesService.remove(Number(id), req.user.userId);
  }
} 