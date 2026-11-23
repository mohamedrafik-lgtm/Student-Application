import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GradeReleaseService } from './grade-release.service';
import { CreateGradeReleaseDto, UpdateGradeReleaseDto } from './dto/grade-release.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('إدارة إعلان الدرجات')
@ApiBearerAuth()
@Controller('grade-release')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class GradeReleaseController {
  constructor(private readonly gradeReleaseService: GradeReleaseService) {}

  @Get('programs')
  @RequirePermission('dashboard.grade-release', 'view')
  @ApiOperation({ summary: 'جلب جميع البرامج مع الفصول الدراسية وإعدادات الإعلان' })
  @ApiResponse({ status: 200, description: 'تم جلب البيانات بنجاح' })
  async getAllPrograms() {
    return this.gradeReleaseService.getAllProgramsWithSemesters();
  }

  @Post()
  @RequirePermission('dashboard.grade-release', 'manage')
  @ApiOperation({ summary: 'إنشاء إعداد إعلان درجات جديد' })
  @ApiResponse({ status: 201, description: 'تم الإنشاء بنجاح' })
  async create(@Body() createDto: CreateGradeReleaseDto, @Req() req: any) {
    return this.gradeReleaseService.create(createDto, req.user.email);
  }

  @Get(':id')
  @RequirePermission('dashboard.grade-release', 'view')
  @ApiOperation({ summary: 'جلب إعداد محدد' })
  @ApiResponse({ status: 200, description: 'تم جلب الإعداد بنجاح' })
  async findOne(@Param('id') id: string) {
    return this.gradeReleaseService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('dashboard.grade-release', 'manage')
  @ApiOperation({ summary: 'تحديث إعداد إعلان الدرجات' })
  @ApiResponse({ status: 200, description: 'تم التحديث بنجاح' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGradeReleaseDto,
    @Req() req: any,
  ) {
    return this.gradeReleaseService.update(id, updateDto, req.user.email);
  }

  @Delete(':id')
  @RequirePermission('dashboard.grade-release', 'manage')
  @ApiOperation({ summary: 'حذف إعداد' })
  @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
  async remove(@Param('id') id: string) {
    return this.gradeReleaseService.remove(id);
  }
}
