import {
  BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Request,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TraineeJwtAuthGuard } from '../trainee-auth/guards/trainee-jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { UploadService } from '../upload/upload.service';
import { CreateTechnicalReportDto } from './dto/create-technical-report.dto';
import { ResolveTechnicalReportDto } from './dto/resolve-technical-report.dto';
import { TechnicalReportsService } from './technical-reports.service';

const imageInterceptor = () => FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) return callback(new BadRequestException('يُسمح بإرفاق صور JPG وPNG وWEBP وGIF فقط'), false);
    callback(null, true);
  },
});

@ApiTags('البلاغات التقنية')
@ApiBearerAuth()
@Controller('technical-reports')
export class TechnicalReportsController {
  constructor(private readonly service: TechnicalReportsService, private readonly uploadService: UploadService) {}

  @Post('admin')
  @UseGuards(JwtAuthGuard)
  async createFromAdmin(@Request() req, @Body() dto: CreateTechnicalReportDto) {
    return this.service.createForAdmin(req.user.userId, dto);
  }

  @Post('trainee')
  @UseGuards(TraineeJwtAuthGuard)
  async createFromTrainee(@Request() req, @Body() dto: CreateTechnicalReportDto) {
    return this.service.createForTrainee(req.user.traineeId, dto);
  }

  @Post('admin/image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(imageInterceptor())
  @ApiConsumes('multipart/form-data')
  async uploadAdminImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('اختر صورة صالحة لا يتجاوز حجمها 5 ميجابايت');
    return this.uploadService.uploadFile(file, 'technical-reports');
  }

  @Post('trainee/image')
  @UseGuards(TraineeJwtAuthGuard)
  @UseInterceptors(imageInterceptor())
  @ApiConsumes('multipart/form-data')
  async uploadTraineeImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('اختر صورة صالحة لا يتجاوز حجمها 5 ميجابايت');
    return this.uploadService.uploadFile(file, 'technical-reports');
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.technical-reports', 'view')
  async findAll(@Query() query: { page?: string; limit?: string; search?: string; status?: string; platform?: string }) {
    return this.service.findAll(query);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.technical-reports', 'manage')
  async resolve(@Param('id') id: string, @Request() req, @Body() dto: ResolveTechnicalReportDto) {
    return this.service.resolve(id, req.user.userId, dto);
  }
}
