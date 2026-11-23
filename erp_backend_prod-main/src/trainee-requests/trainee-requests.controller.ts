import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TraineeJwtAuthGuard } from '../trainee-auth/guards/trainee-jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { TraineeRequestsService } from './trainee-requests.service';
import { CreateTraineeRequestDto, RequestType } from './dto/create-request.dto';
import { ReviewRequestDto } from './dto/review-request.dto';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('طلبات المتدربين المجانية')
@Controller('trainee-requests')
export class TraineeRequestsController {
  constructor(
    private readonly service: TraineeRequestsService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  /**
   * ==========================================
   * APIs للمتدربين
   * ==========================================
   */

  @Post()
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إنشاء طلب جديد (للمتدربين)' })
  async createRequest(
    @Request() req,
    @Body() createDto: CreateTraineeRequestDto,
  ) {
    const traineeId = req.user.traineeId;
    return this.service.create(traineeId, createDto);
  }

  @Get('my-requests')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب طلباتي (للمتدربين)' })
  async getMyRequests(@Request() req) {
    const traineeId = req.user.traineeId;
    return this.service.findMyRequests(traineeId);
  }

  /**
   * ==========================================
   * APIs للإدارة
   * ==========================================
   */

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.trainee-requests', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب جميع الطلبات (للإدارة)' })
  async findAll(@Query() query: any, @Request() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    if (allowedProgramIds.length > 0) query.allowedProgramIds = allowedProgramIds;
    return this.service.findAll(query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.trainee-requests', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إحصائيات الطلبات' })
  async getStats(@Query('type') type?: string, @Request() req?) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req?.user?.userId);
    return this.service.getStats(type as RequestType, allowedProgramIds.length > 0 ? allowedProgramIds : undefined);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.trainee-requests', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب تفاصيل طلب' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/review')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.trainee-requests', 'review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'مراجعة طلب (قبول/رفض)' })
  async reviewRequest(
    @Param('id') id: string,
    @Body() reviewDto: ReviewRequestDto,
    @Request() req,
  ) {
    return this.service.review(id, reviewDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.trainee-requests', 'delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف طلب' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}