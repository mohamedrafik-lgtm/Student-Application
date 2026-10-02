import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Request, 
  UseGuards, 
  HttpStatus,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsEnum, IsDateString } from 'class-validator';
import { WhatsAppCampaignsService, CreateCampaignDto, UpdateCampaignDto } from './campaigns.service';
import { MessageTemplatesService, CreateTemplateDto, UpdateTemplateDto } from './templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { UserProgramAccessService } from '../users/user-program-access.service';

// DTOs for API documentation
class CreateCampaignApiDto {
  @ApiProperty({ example: 'حملة ترحيب المتدربين الجدد', description: 'اسم الحملة' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'حملة ترحيب للمتدربين المسجلين حديثاً', description: 'وصف الحملة', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'template-id-123', description: 'معرف القالب المستخدم', required: false })
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiProperty({ 
    example: 'مرحباً {{trainee_name}}، أهلاً بك في {{center_name}}', 
    description: 'محتوى الرسالة' 
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: 5, description: 'فترة التأخير بين الرسائل (بالثواني)', required: false })
  @IsNumber()
  @IsOptional()
  delayBetweenMessages?: number;

  @ApiProperty({ 
    example: 'all', 
    description: 'نوع الاستهداف',
    enum: ['all', 'program', 'custom']
  })
  @IsEnum(['all', 'program', 'custom'])
  targetType: 'all' | 'program' | 'custom';

  @ApiProperty({ example: 1, description: 'معرف البرنامج المستهدف', required: false })
  @IsNumber()
  @IsOptional()
  targetProgramId?: number;

  @ApiProperty({ example: [1, 2, 3], description: 'معرفات المتدربين المستهدفين', required: false })
  @IsArray()
  @IsOptional()
  targetTraineeIds?: number[];

  @ApiProperty({ example: '2024-12-01T10:00:00Z', description: 'موعد تشغيل الحملة', required: false })
  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;
}

class UpdateCampaignApiDto {
  @ApiProperty({ example: 'حملة ترحيب محدثة', description: 'اسم الحملة', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'وصف محدث للحملة', description: 'وصف الحملة', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'رسالة محدثة', description: 'محتوى الرسالة', required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ example: 10, description: 'فترة التأخير بين الرسائل', required: false })
  @IsNumber()
  @IsOptional()
  delayBetweenMessages?: number;

  @ApiProperty({ example: '2024-12-01T10:00:00Z', description: 'موعد تشغيل الحملة', required: false })
  @IsDateString()
  @IsOptional()
  scheduledAt?: Date;
}

class CreateTemplateApiDto {
  @ApiProperty({ example: 'قالب ترحيب المتدربين', description: 'اسم القالب' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    example: 'مرحباً {{trainee_name}}، أهلاً بك في {{center_name}}', 
    description: 'محتوى القالب' 
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 'قالب لترحيب المتدربين الجدد', description: 'وصف القالب', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'welcome', description: 'فئة القالب', required: false })
  @IsString()
  @IsOptional()
  category?: string;
}

class UpdateTemplateApiDto {
  @ApiProperty({ example: 'قالب محدث', description: 'اسم القالب', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'محتوى محدث', description: 'محتوى القالب', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ example: 'وصف محدث', description: 'وصف القالب', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'general', description: 'فئة القالب', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: true, description: 'حالة نشاط القالب', required: false })
  @IsOptional()
  isActive?: boolean;
}

@ApiTags('whatsapp-campaigns')
@ApiBearerAuth()
@Controller('whatsapp/campaigns')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WhatsAppCampaignsController {
  constructor(
    private readonly campaignsService: WhatsAppCampaignsService,
    private readonly templatesService: MessageTemplatesService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  // ========== إدارة الحملات ==========

  @Post()
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'إنشاء حملة جديدة' })
  @ApiBody({ type: CreateCampaignApiDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'تم إنشاء الحملة بنجاح' })
  async createCampaign(@Body() dto: CreateCampaignDto, @Request() req) {
    console.log('Create campaign - Request user:', req.user);
    console.log('Create campaign - User ID:', req.user?.id);
    
    // استخدام معرف المستخدم أو قيمة افتراضية مؤقتة
    const userId = req.user?.id || req.user?.userId || 'system';
    
    // التحقق من صلاحية الوصول للبرنامج المستهدف
    if ((dto as any).targetProgramId) {
      await this.userProgramAccessService.applyProgramFilter(req.user?.userId, (dto as any).targetProgramId);
    }
    
    const campaign = await this.campaignsService.createCampaign(dto, userId);
    return {
      success: true,
      message: 'تم إنشاء الحملة بنجاح',
      data: campaign
    };
  }

  // ========== إدارة القوالب (يجب أن تأتي قبل dynamic routes) ==========

  @Get('templates')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'الحصول على جميع القوالب' })
  @ApiQuery({ name: 'active', required: false, description: 'عرض القوالب النشطة فقط' })
  @ApiQuery({ name: 'category', required: false, description: 'فلترة حسب الفئة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب القوالب بنجاح' })
  async getAllTemplates(@Query('active') active: string, @Query('category') category: string) {
    let templates;
    
    if (category) {
      templates = await this.templatesService.getTemplatesByCategory(category);
    } else {
      const activeOnly = active === 'true';
      templates = await this.templatesService.getAllTemplates(activeOnly);
    }

    return {
      success: true,
      data: templates
    };
  }

  @Get('templates/:id')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'الحصول على قالب محدد' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب القالب بنجاح' })
  async getTemplateById(@Param('id') id: string) {
    const template = await this.templatesService.getTemplateById(id);
    return {
      success: true,
      data: template
    };
  }

  @Get('templates/stats/overview')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'الحصول على إحصائيات القوالب' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب الإحصائيات بنجاح' })
  async getTemplatesStats() {
    const stats = await this.templatesService.getTemplatesStats();
    return {
      success: true,
      data: stats
    };
  }

  @Get('templates/grouped/by-category')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'الحصول على القوالب مجمعة حسب الفئة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب القوالب بنجاح' })
  async getTemplatesGroupedByCategory() {
    const templates = await this.templatesService.getTemplatesGroupedByCategory();
    return {
      success: true,
      data: templates
    };
  }

  @Get('stats/overall')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'الحصول على الإحصائيات العامة للحملات' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب الإحصائيات بنجاح' })
  async getOverallStats() {
    const stats = await this.campaignsService.getOverallStats();
    return {
      success: true,
      data: stats
    };
  }

  @Get()
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'الحصول على جميع الحملات' })
  @ApiQuery({ name: 'own', required: false, description: 'عرض الحملات الخاصة بالمستخدم فقط' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب الحملات بنجاح' })
  async getAllCampaigns(@Query('own') own: string, @Request() req) {
    const userId = own === 'true' ? req.user.id : undefined;
    const campaigns = await this.campaignsService.getAllCampaigns(userId);
    return {
      success: true,
      data: campaigns
    };
  }

  @Get(':id')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'الحصول على حملة محددة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب الحملة بنجاح' })
  async getCampaignById(@Param('id') id: string) {
    const campaign = await this.campaignsService.getCampaignById(id);
    return {
      success: true,
      data: campaign
    };
  }

  @Put(':id')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'تحديث حملة' })
  @ApiBody({ type: UpdateCampaignApiDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم تحديث الحملة بنجاح' })
  async updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto, @Request() req) {
    const campaign = await this.campaignsService.updateCampaign(id, dto, req.user.id);
    return {
      success: true,
      message: 'تم تحديث الحملة بنجاح',
      data: campaign
    };
  }

  @Delete(':id')
  @RequirePermission('whatsapp', 'manage')
  @ApiOperation({ summary: 'حذف حملة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم حذف الحملة بنجاح' })
  async deleteCampaign(@Param('id') id: string, @Request() req) {
    await this.campaignsService.deleteCampaign(id, req.user.id);
    return {
      success: true,
      message: 'تم حذف الحملة بنجاح'
    };
  }

  @Post(':id/start')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'بدء تشغيل حملة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم بدء الحملة بنجاح' })
  async startCampaign(@Param('id') id: string, @Request() req) {
    await this.campaignsService.startCampaign(id, req.user?.id || 'system');
    return {
      success: true,
      message: 'تم بدء الحملة بنجاح'
    };
  }

  @Post(':id/pause')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'إيقاف حملة مؤقتاً' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم إيقاف الحملة بنجاح' })
  async pauseCampaign(@Param('id') id: string, @Request() req) {
    await this.campaignsService.pauseCampaign(id, req.user?.id || 'system');
    return {
      success: true,
      message: 'تم إيقاف الحملة بنجاح'
    };
  }

  @Post(':id/stop')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'إيقاف حملة نهائياً' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم إيقاف الحملة نهائياً' })
  async stopCampaign(@Param('id') id: string, @Request() req) {
    await this.campaignsService.stopCampaign(id, req.user?.id || 'system');
    return {
      success: true,
      message: 'تم إيقاف الحملة نهائياً'
    };
  }

  @Get(':id/stats')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'الحصول على إحصائيات حملة' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم جلب الإحصائيات بنجاح' })
  async getCampaignStats(@Param('id') id: string) {
    const stats = await this.campaignsService.getCampaignStats(id);
    return {
      success: true,
      data: stats
    };
  }

  @Post('templates')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'إنشاء قالب رسالة جديد' })
  @ApiBody({ type: CreateTemplateApiDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'تم إنشاء القالب بنجاح' })
  async createTemplate(@Body() dto: CreateTemplateDto, @Request() req) {
    console.log('Request user:', req.user);
    console.log('User ID:', req.user?.id);
    
    // استخدام معرف المستخدم أو قيمة افتراضية مؤقتة
    const userId = req.user?.id || 'system';
    
    const template = await this.templatesService.createTemplate(dto, userId);
    return {
      success: true,
      message: 'تم إنشاء القالب بنجاح',
      data: template
    };
  }

  @Put('templates/:id')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'تحديث قالب' })
  @ApiBody({ type: UpdateTemplateApiDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم تحديث القالب بنجاح' })
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @Request() req) {
    const template = await this.templatesService.updateTemplate(id, dto, req.user.id);
    return {
      success: true,
      message: 'تم تحديث القالب بنجاح',
      data: template
    };
  }

  @Delete('templates/:id')
  @RequirePermission('whatsapp', 'manage')
  @ApiOperation({ summary: 'حذف قالب' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم حذف القالب بنجاح' })
  async deleteTemplate(@Param('id') id: string, @Request() req) {
    await this.templatesService.deleteTemplate(id, req.user.id);
    return {
      success: true,
      message: 'تم حذف القالب بنجاح'
    };
  }

  @Post('templates/:id/preview')
  @RequirePermission('whatsapp', 'read')
  @ApiOperation({ summary: 'معاينة قالب مع بيانات تجريبية' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم إنشاء المعاينة بنجاح' })
  async previewTemplate(@Param('id') id: string, @Body() sampleData?: any) {
    const preview = await this.templatesService.previewTemplate(id, sampleData);
    return {
      success: true,
      data: preview
    };
  }

  @Post('templates/:id/duplicate')
  @RequirePermission('whatsapp', 'write')
  @ApiOperation({ summary: 'نسخ قالب موجود' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        newName: { type: 'string', example: 'نسخة من القالب الأصلي' } 
      },
      required: ['newName']
    } 
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'تم نسخ القالب بنجاح' })
  async duplicateTemplate(@Param('id') id: string, @Body('newName') newName: string, @Request() req) {
    const template = await this.templatesService.duplicateTemplate(id, newName, req.user.id);
    return {
      success: true,
      message: 'تم نسخ القالب بنجاح',
      data: template
    };
  }

}
