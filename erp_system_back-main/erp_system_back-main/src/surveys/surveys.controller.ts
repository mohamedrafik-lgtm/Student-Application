import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SubmitSurveyResponseDto } from './dto/submit-survey.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TraineeJwtAuthGuard } from '../trainee-auth/guards/trainee-jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('الاستبيانات')
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  // ==================== Trainee APIs ====================

  @Get('my-surveys')
  @UseGuards(TraineeJwtAuthGuard)
  async getAvailableSurveys(@Request() req) {
    const traineeId = req.user.traineeId;
    return this.surveysService.findAvailableForTrainee(traineeId);
  }

  @Post(':id/submit')
  @UseGuards(TraineeJwtAuthGuard)
  async submitResponse(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: SubmitSurveyResponseDto,
  ) {
    const traineeId = req.user.traineeId;
    return this.surveysService.submitResponse(id, traineeId, dto);
  }

  // ==================== Admin APIs ====================

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.surveys', 'create')
  async create(@Body() dto: CreateSurveyDto, @Request() req) {
    return this.surveysService.create(dto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.surveys', 'view')
  async findAll() {
    return this.surveysService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.surveys', 'view')
  async findOne(@Param('id') id: string) {
    return this.surveysService.findOne(id);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.surveys', 'view')
  async getStats(@Param('id') id: string) {
    return this.surveysService.getStats(id);
  }

  @Put(':id/toggle')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.surveys', 'manage')
  async toggleActive(@Param('id') id: string) {
    return this.surveysService.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.surveys', 'delete')
  async remove(@Param('id') id: string) {
    return this.surveysService.remove(id);
  }
}
