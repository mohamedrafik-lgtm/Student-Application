import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { LocationsService } from './locations.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CreateGovernorateDto } from './dto/create-governorate.dto';
import { UpdateGovernorateDto } from './dto/update-governorate.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@ApiTags('Locations')
@ApiBearerAuth()
@Controller('locations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ==================== Countries ====================
  
  @Get('countries')
  @ApiOperation({ summary: 'جلب جميع الدول' })
  async getAllCountries() {
    return this.locationsService.getAllCountries();
  }

  @Post('countries')
  @RequirePermission('dashboard.settings.locations', 'manage')
  @ApiOperation({ summary: 'إضافة دولة جديدة' })
  async createCountry(@Body() createDto: CreateCountryDto) {
    return this.locationsService.createCountry(createDto);
  }

  @Get('countries/:id')
  @ApiOperation({ summary: 'جلب دولة بالمعرف' })
  async getCountryById(@Param('id') id: string) {
    return this.locationsService.getCountryById(id);
  }

  @Patch('countries/:id')
  @RequirePermission('dashboard.settings.locations', 'manage')
  @ApiOperation({ summary: 'تحديث دولة' })
  async updateCountry(@Param('id') id: string, @Body() updateDto: UpdateCountryDto) {
    return this.locationsService.updateCountry(id, updateDto);
  }

  @Delete('countries/:id')
  @RequirePermission('dashboard.settings.locations', 'manage')
  @ApiOperation({ summary: 'حذف دولة' })
  async deleteCountry(@Param('id') id: string) {
    return this.locationsService.deleteCountry(id);
  }

  // ==================== Governorates ====================
  
  @Get('countries/:countryId/governorates')
  @ApiOperation({ summary: 'جلب محافظات دولة' })
  async getGovernoratesByCountry(@Param('countryId') countryId: string) {
    return this.locationsService.getGovernoratesByCountry(countryId);
  }

  @Post('governorates')
  @RequirePermission('dashboard.settings.locations', 'manage')
  @ApiOperation({ summary: 'إضافة محافظة جديدة' })
  async createGovernorate(@Body() createDto: CreateGovernorateDto) {
    return this.locationsService.createGovernorate(createDto);
  }

  @Get('governorates/:id')
  @ApiOperation({ summary: 'جلب محافظة بالمعرف' })
  async getGovernorateById(@Param('id') id: string) {
    return this.locationsService.getGovernorateById(id);
  }

  @Patch('governorates/:id')
  @RequirePermission('dashboard.settings.locations', 'manage')
  @ApiOperation({ summary: 'تحديث محافظة' })
  async updateGovernorate(@Param('id') id: string, @Body() updateDto: UpdateGovernorateDto) {
    return this.locationsService.updateGovernorate(id, updateDto);
  }

  @Delete('governorates/:id')
  @RequirePermission('dashboard.settings.locations', 'manage')
  @ApiOperation({ summary: 'حذف محافظة' })
  async deleteGovernorate(@Param('id') id: string) {
    return this.locationsService.deleteGovernorate(id);
  }

  // ==================== Cities ====================
  
  @Get('governorates/:governorateId/cities')
  @ApiOperation({ summary: 'جلب مدن محافظة' })
  async getCitiesByGovernorate(@Param('governorateId') governorateId: string) {
    return this.locationsService.getCitiesByGovernorate(governorateId);
  }

  @Post('cities')
  @RequirePermission('dashboard.settings.locations', 'manage')
  @ApiOperation({ summary: 'إضافة مدينة جديدة' })
  async createCity(@Body() createDto: CreateCityDto) {
    return this.locationsService.createCity(createDto);
  }

  @Get('cities/:id')
  @ApiOperation({ summary: 'جلب مدينة بالمعرف' })
  async getCityById(@Param('id') id: string) {
    return this.locationsService.getCityById(id);
  }

  @Patch('cities/:id')
  @RequirePermission('dashboard.settings.locations', 'manage')
  @ApiOperation({ summary: 'تحديث مدينة' })
  async updateCity(@Param('id') id: string, @Body() updateDto: UpdateCityDto) {
    return this.locationsService.updateCity(id, updateDto);
  }

  @Delete('cities/:id')
  @RequirePermission('dashboard.settings.locations', 'manage')
  @ApiOperation({ summary: 'حذف مدينة' })
  async deleteCity(@Param('id') id: string) {
    return this.locationsService.deleteCity(id);
  }

  // ==================== Utility ====================
  
  @Get('tree')
  @ApiOperation({ summary: 'جلب البنية الكاملة للمواقع' })
  async getLocationsTree() {
    return this.locationsService.getLocationsTree();
  }

  @Get('search')
  @ApiOperation({ summary: 'البحث في المواقع' })
  async searchLocations(@Query('q') query: string) {
    return this.locationsService.searchLocations(query);
  }
}