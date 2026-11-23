import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamCommitteesService } from './exam-committees.service';
import { BulkCreateExamCommitteeDto } from './dto/create-exam-committee.dto';
import { LookupExamCommitteeDto } from './dto/lookup-exam-committee.dto';

@ApiTags('Exam Committees')
@Controller('exam-committees')
export class ExamCommitteesController {
  constructor(private readonly examCommitteesService: ExamCommitteesService) {}

  @Get('public/lookup')
  @ApiOperation({ summary: 'استعلام عام عن بيانات لجنة الاختبار بالرقم القومي' })
  @ApiQuery({ name: 'nationalId', description: 'الرقم القومي (14 رقم)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'بيانات لجنة الاختبار' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'لا توجد بيانات' })
  async publicLookup(@Query() query: LookupExamCommitteeDto) {
    return this.examCommitteesService.lookupByNationalId(query.nationalId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على قائمة لجان الاختبارات' })
  @ApiResponse({ status: HttpStatus.OK, description: 'قائمة لجان الاختبارات' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.examCommitteesService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      search,
    );
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'رفع بيانات لجان الاختبارات (Excel)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'تم رفع البيانات بنجاح' })
  async bulkCreate(@Body() dto: BulkCreateExamCommitteeDto, @Request() req: any) {
    const actorId = req.user?.userId || req.user?.id;
    return this.examCommitteesService.bulkCreate(dto, actorId);
  }

  @Delete('bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف جميع بيانات لجان الاختبارات' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم الحذف بنجاح' })
  async removeAll(@Request() req: any) {
    const actorId = req.user?.userId || req.user?.id;
    return this.examCommitteesService.removeAll(actorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف سجل لجنة محدد' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم الحذف بنجاح' })
  async remove(@Param('id') id: string, @Request() req: any) {
    const actorId = req.user?.userId || req.user?.id;
    return this.examCommitteesService.remove(parseInt(id, 10), actorId);
  }
}
