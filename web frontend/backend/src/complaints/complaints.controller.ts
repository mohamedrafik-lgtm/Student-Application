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
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ReviewComplaintDto } from './dto/review-complaint.dto';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('الشكاوي والاقتراحات')
@Controller('complaints')
export class ComplaintsController {
  constructor(
    private readonly service: ComplaintsService,
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
  @ApiOperation({ summary: 'إنشاء شكوى/اقتراح جديد (للمتدربين)' })
  async create(@Request() req, @Body() createDto: CreateComplaintDto) {
    const traineeId = req.user.traineeId;
    return this.service.create(traineeId, createDto);
  }

  @Get('my-complaints')
  @UseGuards(TraineeJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب شكاويي واقتراحاتي (للمتدربين)' })
  async getMyComplaints(@Request() req) {
    const traineeId = req.user.traineeId;
    return this.service.findMyComplaints(traineeId);
  }

  /**
   * ==========================================
   * APIs للإدارة
   * ==========================================
   */

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.complaints', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب جميع الشكاوي والاقتراحات (للإدارة)' })
  async findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?,
  ) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req?.user?.userId);
    return this.service.findAll({
      type,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      allowedProgramIds: allowedProgramIds.length > 0 ? allowedProgramIds : undefined,
    });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.complaints', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إحصائيات الشكاوي والاقتراحات' })
  async getStats(@Request() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.service.getStats(allowedProgramIds.length > 0 ? allowedProgramIds : undefined);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.complaints', 'view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'جلب تفاصيل شكوى/اقتراح' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/review')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.complaints', 'review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'مراجعة شكوى/اقتراح' })
  async review(
    @Param('id') id: string,
    @Body() reviewDto: ReviewComplaintDto,
    @Request() req,
  ) {
    return this.service.review(id, reviewDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('dashboard.complaints', 'delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف شكوى/اقتراح' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
