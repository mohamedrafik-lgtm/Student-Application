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
  ParseIntPipe 
} from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { 
  CreateCommissionDto, 
  UpdateCommissionDto, 
  CreatePayoutDto,
  CommissionFiltersDto 
} from './dto/commission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@Controller('commissions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Post()
  @RequirePermission('commissions', 'create')
  async createCommission(
    @Body() createCommissionDto: CreateCommissionDto,
    @Request() req: any,
  ) {
    return this.commissionsService.createCommission(createCommissionDto, req.user?.id);
  }

  @Get()
  @RequirePermission('commissions', 'read')
  async getAllCommissions(@Query() filters: CommissionFiltersDto) {
    return this.commissionsService.getAllCommissions(filters);
  }

  @Get('stats')
  @RequirePermission('commissions', 'read')
  async getCommissionStats(@Query('marketingEmployeeId') marketingEmployeeId?: number) {
    return this.commissionsService.getCommissionStats(marketingEmployeeId);
  }

  @Get('marketing-employees-stats')
  @RequirePermission('commissions', 'read')
  async getMarketingEmployeesStats() {
    return this.commissionsService.getMarketingEmployeesStats();
  }

  @Get(':id')
  @RequirePermission('commissions', 'read')
  async getCommissionById(@Param('id', ParseIntPipe) id: number) {
    return this.commissionsService.getCommissionById(id);
  }

  @Put(':id')
  @RequirePermission('commissions', 'update')
  async updateCommission(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommissionDto: UpdateCommissionDto,
    @Request() req: any,
  ) {
    return this.commissionsService.updateCommission(id, updateCommissionDto, req.user?.id);
  }

  @Delete(':id')
  @RequirePermission('commissions', 'delete')
  async deleteCommission(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.commissionsService.deleteCommission(id, req.user?.id);
  }

  @Post(':id/payout')
  @RequirePermission('commissions', 'payout')
  async createPayout(
    @Param('id', ParseIntPipe) id: number,
    @Body() createPayoutDto: CreatePayoutDto,
    @Request() req: any,
  ) {
    return this.commissionsService.createPayout(id, createPayoutDto, req.user?.userId || req.user?.id);
  }
}
