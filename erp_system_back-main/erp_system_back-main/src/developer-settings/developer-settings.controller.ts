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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DeveloperSettingsService } from './developer-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeveloperSettingDto, UpdateDeveloperSettingDto } from './dto/developer-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('إعدادات المطورين')
@ApiBearerAuth()
@Controller('developer-settings')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DeveloperSettingsController {
  constructor(
    private readonly developerSettingsService: DeveloperSettingsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequirePermission('dashboard.developer-settings', 'manage')
  @ApiOperation({ summary: 'إنشاء إعداد جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الإعداد بنجاح' })
  async create(@Body() createDto: CreateDeveloperSettingDto, @Req() req: any) {
    return this.developerSettingsService.create(createDto, req.user.email);
  }

  @Get()
  @RequirePermission('dashboard.developer-settings', 'view')
  @ApiOperation({ summary: 'جلب جميع الإعدادات' })
  @ApiResponse({ status: 200, description: 'تم جلب الإعدادات بنجاح' })
  async findAll(@Query('includeValues') includeValues?: string) {
    const include = includeValues === 'true';
    return this.developerSettingsService.findAll(include);
  }

  @Get(':id')
  @RequirePermission('dashboard.developer-settings', 'view')
  @ApiOperation({ summary: 'جلب إعداد محدد' })
  @ApiResponse({ status: 200, description: 'تم جلب الإعداد بنجاح' })
  async findOne(@Param('id') id: string, @Query('decrypted') decrypted?: string) {
    const decrypt = decrypted !== 'false';
    return this.developerSettingsService.findOne(id, decrypt);
  }

  @Put(':id')
  @RequirePermission('dashboard.developer-settings', 'manage')
  @ApiOperation({ summary: 'تحديث إعداد' })
  @ApiResponse({ status: 200, description: 'تم تحديث الإعداد بنجاح' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeveloperSettingDto,
    @Req() req: any,
  ) {
    return this.developerSettingsService.update(id, updateDto, req.user.email);
  }

  @Delete(':id')
  @RequirePermission('dashboard.developer-settings', 'manage')
  @ApiOperation({ summary: 'حذف إعداد' })
  @ApiResponse({ status: 200, description: 'تم حذف الإعداد بنجاح' })
  async remove(@Param('id') id: string) {
    return this.developerSettingsService.remove(id);
  }

  @Get('stats/vision-ai')
  @RequirePermission('dashboard.developer-settings', 'view')
  @ApiOperation({ summary: 'احصائيات Vision AI' })
  @ApiResponse({ status: 200, description: 'تم جلب الاحصائيات بنجاح' })
  async getVisionAIStats() {
    // عدد الأوراق المصححة (GRADED or VERIFIED)
    const gradedCount = await this.prisma.paperAnswerSheet.count({
      where: {
        status: {
          in: ['GRADED', 'VERIFIED'],
        },
      },
    });

    return {
      totalGradedSheets: gradedCount,
    };
  }
}
