import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StudyMaterialsService } from './study-materials.service';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto';
import { UpdateStudyMaterialDto } from './dto/update-study-material.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { QueryStudyMaterialsDto } from './dto/query-study-materials.dto';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('study-materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('study-materials')
export class StudyMaterialsController {
  constructor(
    private readonly studyMaterialsService: StudyMaterialsService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  // =====================================================
  // إدارة الأدوات الدراسية
  // =====================================================

  @Post()
  @ApiOperation({ summary: 'إنشاء أداة دراسية جديدة' })
  @RequirePermission('study-materials', 'create')
  create(@Body() createDto: CreateStudyMaterialDto, @Request() req) {
    return this.studyMaterialsService.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'جلب جميع الأدوات الدراسية' })
  @RequirePermission('study-materials', 'view')
  findAll(@Query() query: QueryStudyMaterialsDto, @Request() req) {
    // تطبيق فلتر البرامج
    return this.userProgramAccessService.applyProgramFilter(req.user.userId, query.programId ? +query.programId : undefined).then(programFilter => {
      if (programFilter.programId) (query as any).programId = programFilter.programId;
      return this.studyMaterialsService.findAll(query);
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'إحصائيات الأدوات الدراسية' })
  @ApiQuery({ name: 'programId', required: false })
  @RequirePermission('study-materials', 'view')
  async getStats(@Query('programId') programId?: string, @Request() req?) {
    const requestedProgramId = programId ? parseInt(programId) : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req?.user?.userId, requestedProgramId);
    return this.studyMaterialsService.getStats(
      programFilter.programId as number | undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'جلب أداة دراسية محددة' })
  @RequirePermission('study-materials', 'view')
  findOne(@Param('id') id: string) {
    return this.studyMaterialsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث أداة دراسية' })
  @RequirePermission('study-materials', 'update')
  update(@Param('id') id: string, @Body() updateDto: UpdateStudyMaterialDto, @Request() req) {
    return this.studyMaterialsService.update(id, updateDto, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف أداة دراسية' })
  @RequirePermission('study-materials', 'delete')
  remove(@Param('id') id: string) {
    return this.studyMaterialsService.remove(id);
  }

  // =====================================================
  // إدارة سجلات التسليم
  // =====================================================

  @Post('deliveries')
  @ApiOperation({ summary: 'إنشاء سجل تسليم جديد' })
  @RequirePermission('study-materials.deliveries', 'create')
  createDelivery(@Body() createDto: CreateDeliveryDto, @Request() req) {
    return this.studyMaterialsService.createDelivery(createDto, req.user.userId);
  }

  @Get('deliveries/list')
  @ApiOperation({ summary: 'جلب جميع سجلات التسليم' })
  @RequirePermission('study-materials.deliveries', 'view')
  findAllDeliveries(@Query() query: QueryDeliveriesDto) {
    return this.studyMaterialsService.findAllDeliveries(query);
  }

  @Get('deliveries/:id')
  @ApiOperation({ summary: 'جلب سجل تسليم محدد' })
  @RequirePermission('study-materials.deliveries', 'view')
  findOneDelivery(@Param('id') id: string) {
    return this.studyMaterialsService.findOneDelivery(id);
  }

  @Patch('deliveries/:id')
  @ApiOperation({ summary: 'تحديث سجل تسليم' })
  @RequirePermission('study-materials.deliveries', 'update')
  updateDelivery(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeliveryDto,
    @Request() req,
  ) {
    return this.studyMaterialsService.updateDelivery(
      id,
      updateDto,
      req.user.userId,
    );
  }

  @Delete('deliveries/:id')
  @ApiOperation({ summary: 'حذف سجل تسليم' })
  @RequirePermission('study-materials.deliveries', 'delete')
  removeDelivery(@Param('id') id: string) {
    return this.studyMaterialsService.removeDelivery(id);
  }
}

