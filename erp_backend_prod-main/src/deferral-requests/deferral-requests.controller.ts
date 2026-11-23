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
import { DeferralRequestsService } from './deferral-requests.service';
import { CreateDeferralRequestDto } from './dto/create-deferral-request.dto';
import { ReviewDeferralRequestDto } from './dto/review-deferral-request.dto';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('طلبات تأجيل السداد')
@Controller('deferral-requests')
export class DeferralRequestsController {
  constructor(
    private readonly service: DeferralRequestsService,
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
  @ApiOperation({ summary: 'إنشاء طلب تأجيل سداد جديد (للمتدربين)' })
  async createRequest(
    @Request() req,
    @Body() createDto: CreateDeferralRequestDto,
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
  @RequirePermission('dashboard.deferral-requests', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب جميع الطلبات (للإدارة)' })
  async findAll(@Query() query: any, @Request() req) {
    // تطبيق فلتر البرامج المسموحة
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req.user.userId, query.programId ? +query.programId : undefined);
    if (programFilter.programId) query.programId = programFilter.programId;
    return this.service.findAll(query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.deferral-requests', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إحصائيات الطلبات' })
  async getStats(@Request() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.getStats(allowedProgramIds.length > 0 ? allowedProgramIds : undefined);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.deferral-requests', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب تفاصيل طلب' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/review')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.deferral-requests', 'review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'مراجعة طلب (قبول/رفض)' })
  async reviewRequest(
    @Param('id') id: string,
    @Body() reviewDto: ReviewDeferralRequestDto,
    @Request() req,
  ) {
    return this.service.review(id, reviewDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.deferral-requests', 'delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف طلب' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}