import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentSchedulesService } from './payment-schedules.service';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { UpdatePaymentScheduleDto } from './dto/update-payment-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payment-schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payment-schedules')
export class PaymentSchedulesController {
  constructor(private readonly service: PaymentSchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء جدول مواعيد سداد جديد' })
  create(@Body() createDto: CreatePaymentScheduleDto, @Request() req) {
    return this.service.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'جلب جميع جداول المواعيد' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'جلب جدول مواعيد محدد' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('fee/:feeId')
  @ApiOperation({ summary: 'جلب جدول المواعيد حسب معرف الرسوم' })
  findByFeeId(@Param('feeId') feeId: string) {
    return this.service.findByFeeId(parseInt(feeId));
  }

  @Put(':id')
  @ApiOperation({ summary: 'تحديث جدول المواعيد' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePaymentScheduleDto) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف جدول المواعيد' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}