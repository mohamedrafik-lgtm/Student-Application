import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { DisciplinaryActionsService } from './disciplinary-actions.service';
import { CreateDisciplinaryActionDto } from './dto/create-disciplinary-action.dto';
import { UpdateDisciplinaryActionDto } from './dto/update-disciplinary-action.dto';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('Disciplinary Actions')
@ApiBearerAuth()
@Controller('disciplinary-actions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DisciplinaryActionsController {
  constructor(
    private readonly disciplinaryActionsService: DisciplinaryActionsService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  @Post()
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'اتخاذ إجراء عقابي جديد' })
  async create(@Body() createDto: CreateDisciplinaryActionDto, @Request() req) {
    return this.disciplinaryActionsService.create(createDto, req.user.userId);
  }

  @Get('trainee/:traineeId')
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'جلب الإجراءات العقابية لمتدرب' })
  async getTraineeActions(@Param('traineeId') traineeId: string) {
    return this.disciplinaryActionsService.getTraineeActions(parseInt(traineeId));
  }

  @Get('trainee/:traineeId/active')
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'جلب الإجراءات النشطة لمتدرب' })
  async getActiveActions(@Param('traineeId') traineeId: string) {
    return this.disciplinaryActionsService.getActiveActions(parseInt(traineeId));
  }

  @Get('trainee/:traineeId/check-suspension')
  @ApiOperation({ summary: 'فحص حالة فصل المتدرب - متاح للجميع للفحص' })
  async checkSuspension(@Param('traineeId') traineeId: string) {
    return this.disciplinaryActionsService.isTraineeSuspended(parseInt(traineeId));
  }

  @Get('stats')
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'إحصائيات الإجراءات العقابية' })
  async getStats(@Request() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.disciplinaryActionsService.getStats(allowedProgramIds.length > 0 ? allowedProgramIds : undefined);
  }

  @Get()
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'جلب جميع الإجراءات مع فلترة' })
  @ApiQuery({ name: 'traineeId', required: false })
  @ApiQuery({ name: 'actionType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getAll(@Query() query: any, @Request() req) {
    // تحويل traineeId من string إلى number
    const filters = {
      ...query,
      traineeId: query.traineeId ? parseInt(query.traineeId) : undefined,
    };
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    if (allowedProgramIds.length > 0) filters.allowedProgramIds = allowedProgramIds;
    return this.disciplinaryActionsService.getAll(filters);
  }

  @Patch(':id')
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'تحديث إجراء عقابي' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDisciplinaryActionDto,
    @Request() req
  ) {
    return this.disciplinaryActionsService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  @RequirePermission('dashboard.trainees.disciplinary-actions', 'manage')
  @ApiOperation({ summary: 'حذف إجراء عقابي' })
  async delete(@Param('id') id: string) {
    return this.disciplinaryActionsService.delete(id);
  }
}