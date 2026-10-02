import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe, Put, Query, Req } from '@nestjs/common';
import { IdCardsService } from './id-cards.service';
import { RecordIdCardPrintDto } from './dto/record-print.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserProgramAccessService } from '../users/user-program-access.service';

@ApiTags('id-cards')
@Controller('id-cards')
@UseGuards(JwtAuthGuard)
export class IdCardsController {
  constructor(
    private readonly idCardsService: IdCardsService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  @Get('settings')
  @ApiOperation({ summary: 'الحصول على إعدادات الكارنيه' })
  @ApiResponse({ status: 200, description: 'تم جلب الإعدادات بنجاح' })
  async getSettings() {
    return this.idCardsService.getSystemSettings();
  }

  @Get('trainee/:id/prints')
  @ApiOperation({ summary: 'الحصول على سجلات طباعة الكارنيه لمتدرب معين' })
  @ApiResponse({ status: 200, description: 'تم جلب سجلات الطباعة بنجاح' })
  async getTraineePrints(@Param('id', ParseIntPipe) traineeId: number) {
    return this.idCardsService.getTraineePrints(traineeId);
  }

  @Post('record-print')
  @ApiOperation({ summary: 'تسجيل عملية طباعة كارنيه' })
  @ApiResponse({ status: 201, description: 'تم تسجيل عملية الطباعة بنجاح' })
  async recordPrint(@Body() recordPrintDto: RecordIdCardPrintDto) {
    return this.idCardsService.recordPrint(recordPrintDto);
  }

  @Post('print')
  @ApiOperation({ summary: 'طباعة كارنيه جديد' })
  @ApiResponse({ status: 201, description: 'تم تسجيل عملية الطباعة بنجاح' })
  async printIdCard(
    @Body() printData: { traineeId: number; designId?: string },
    @Req() req: any
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    
    const recordPrintDto: RecordIdCardPrintDto = {
      traineeId: printData.traineeId,
      printedById: userId,
      designId: printData.designId,
      notes: 'طباعة من نظام الاستعراض الجديد'
    };

    return this.idCardsService.recordPrint(recordPrintDto);
  }

  @Get('trainees-with-status')
  @ApiOperation({ summary: 'الحصول على المتدربين مع حالة الكارنيهات' })
  @ApiResponse({ status: 200, description: 'تم جلب قائمة المتدربين مع حالة الكارنيهات' })
  async getTraineesWithIdCardStatus(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'not_printed' | 'printed' | 'delivered' | 'not_delivered',
    @Query('programId') programId?: string,
    @Req() req?,
  ) {
    const requestedProgramId = programId ? parseInt(programId) : undefined;
    const programFilter = await this.userProgramAccessService.applyProgramFilter(req?.user?.userId, requestedProgramId);
    const filters = {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status,
      programId: programFilter.programId as number | undefined,
    };
    return this.idCardsService.getAllTraineesWithIdCardStatus(filters);
  }

  @Put('delivery-status/:printId')
  @ApiOperation({ summary: 'تحديث حالة تسليم الكارنيه' })
  @ApiResponse({ status: 200, description: 'تم تحديث حالة التسليم بنجاح' })
  async updateDeliveryStatus(
    @Param('printId', ParseIntPipe) printId: number,
    @Body() updateDto: UpdateDeliveryStatusDto,
    @Req() req,
  ) {
    return this.idCardsService.updateDeliveryStatus(
      printId,
      updateDto,
      req.user?.userId || req.user?.id
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'الحصول على إحصائيات الكارنيهات' })
  @ApiResponse({ status: 200, description: 'تم جلب الإحصائيات بنجاح' })
  async getIdCardStatistics(@Req() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    return this.idCardsService.getIdCardStatistics(allowedProgramIds.length > 0 ? allowedProgramIds : undefined);
  }
} 