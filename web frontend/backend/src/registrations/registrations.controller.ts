import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء طلب تسجيل جديد' })
  @ApiBody({ type: CreateRegistrationDto })
  @ApiResponse({ status: 201, description: 'تم إنشاء طلب التسجيل بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  create(@Body() createRegistrationDto: CreateRegistrationDto) {
    return this.registrationsService.create(createRegistrationDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على جميع طلبات التسجيل' })
  @ApiResponse({ status: 200, description: 'قائمة طلبات التسجيل' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ممنوع الوصول' })
  findAll() {
    return this.registrationsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على طلب تسجيل بواسطة المعرف' })
  @ApiParam({ name: 'id', description: 'معرف طلب التسجيل' })
  @ApiResponse({ status: 200, description: 'بيانات طلب التسجيل' })
  @ApiResponse({ status: 404, description: 'طلب التسجيل غير موجود' })
  findOne(@Param('id') id: string) {
    return this.registrationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث حالة طلب تسجيل' })
  @ApiParam({ name: 'id', description: 'معرف طلب التسجيل' })
  @ApiBody({ type: UpdateRegistrationDto })
  @ApiResponse({ status: 200, description: 'تم تحديث طلب التسجيل بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  @ApiResponse({ status: 404, description: 'طلب التسجيل غير موجود' })
  update(
    @Param('id') id: string,
    @Body() updateRegistrationDto: UpdateRegistrationDto,
    @Request() req,
  ) {
    return this.registrationsService.update(id, updateRegistrationDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف طلب تسجيل' })
  @ApiParam({ name: 'id', description: 'معرف طلب التسجيل' })
  @ApiResponse({ status: 200, description: 'تم حذف طلب التسجيل بنجاح' })
  @ApiResponse({ status: 404, description: 'طلب التسجيل غير موجود' })
  remove(@Param('id') id: string, @Request() req) {
    return this.registrationsService.remove(id, req.user.userId);
  }
}