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
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إنشاء وظيفة جديدة' })
  @ApiBody({ type: CreateJobDto })
  @ApiResponse({ status: 201, description: 'تم إنشاء الوظيفة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  create(@Body() createJobDto: CreateJobDto, @Request() req) {
    return this.jobsService.create(createJobDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'الحصول على جميع الوظائف' })
  @ApiResponse({ status: 200, description: 'قائمة الوظائف' })
  findAll() {
    return this.jobsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'الحصول على وظيفة بواسطة المعرف' })
  @ApiParam({ name: 'id', description: 'معرف الوظيفة' })
  @ApiResponse({ status: 200, description: 'بيانات الوظيفة' })
  @ApiResponse({ status: 404, description: 'الوظيفة غير موجودة' })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث بيانات وظيفة' })
  @ApiParam({ name: 'id', description: 'معرف الوظيفة' })
  @ApiBody({ type: UpdateJobDto })
  @ApiResponse({ status: 200, description: 'تم تحديث الوظيفة بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 404, description: 'الوظيفة غير موجودة' })
  update(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @Request() req,
  ) {
    return this.jobsService.update(id, updateJobDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف وظيفة' })
  @ApiParam({ name: 'id', description: 'معرف الوظيفة' })
  @ApiResponse({ status: 200, description: 'تم حذف الوظيفة بنجاح' })
  @ApiResponse({ status: 404, description: 'الوظيفة غير موجودة' })
  remove(@Param('id') id: string, @Request() req) {
    return this.jobsService.remove(id, req.user.userId);
  }
}