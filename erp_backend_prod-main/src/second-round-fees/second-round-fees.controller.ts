import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { SecondRoundFeesService } from './second-round-fees.service';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('Second Round Fees')
@Controller('second-round-fees')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class SecondRoundFeesController {
  constructor(
    private readonly service: SecondRoundFeesService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  @Get('students')
  @RequirePermission('dashboard.grades.second-round-fees', 'manage')
  @ApiOperation({ summary: 'جلب طلاب الدور الثاني مع حالة القيود' })
  async getStudents(
    @Query('programId') programId: string,
    @Query('feeId') feeId?: string,
    @Request() req?: any,
  ) {
    if (!programId) {
      return [];
    }

    const parsedProgramId = parseInt(programId, 10);
    
    // التحقق من صلاحية الوصول للبرنامج
    const programFilter = await this.userProgramAccessService.applyProgramFilter(
      req.user.userId,
      parsedProgramId,
    );

    return this.service.getStudentsWithFeeStatus(
      programFilter.programId as number || parsedProgramId,
      feeId ? parseInt(feeId, 10) : undefined,
    );
  }

  @Get('fees')
  @RequirePermission('dashboard.grades.second-round-fees', 'manage')
  @ApiOperation({ summary: 'جلب القيود المالية المتاحة للبرنامج' })
  async getFees(@Query('programId') programId: string) {
    if (!programId) {
      return [];
    }
    return this.service.getAvailableFees(parseInt(programId, 10));
  }

  @Post('apply')
  @RequirePermission('dashboard.grades.second-round-fees', 'manage')
  @ApiOperation({ summary: 'تطبيق قيد مالي على طلاب الدور الثاني' })
  async applyFee(
    @Body() body: { programId: number; feeId: number },
    @Request() req: any,
  ) {
    return this.service.applyFeeToSecondRound(
      body.programId,
      body.feeId,
      req.user.userId,
    );
  }

  @Get('summary')
  @RequirePermission('dashboard.grades.second-round-fees', 'manage')
  @ApiOperation({ summary: 'ملخص القيود المطبقة' })
  async getSummary(@Query('programId') programId: string) {
    if (!programId) {
      return { applications: [], totalApplications: 0, totalAmount: 0 };
    }
    return this.service.getApplicationsSummary(parseInt(programId, 10));
  }
}
