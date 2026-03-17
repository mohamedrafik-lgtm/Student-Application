import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  async getPublicSettings() {
    const settings = await this.settingsService.getSettings();
    // إرجاع البيانات العامة فقط (بدون معلومات حساسة)
    return {
      success: true,
      settings: {
        centerName: settings.centerName,
        licenseNumber: settings.licenseNumber,
        centerManagerName: settings.centerManagerName,
        centerAddress: settings.centerAddress,
        centerLogo: settings.centerLogo,
        facebookPageUrl: settings.facebookPageUrl,
        timezone: settings.timezone,
      }
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getSettings() {
    const settings = await this.settingsService.getSettings();
    return { success: true, settings };
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    const updated = await this.settingsService.updateSettings(dto);
    return { success: true, settings: updated };
  }
} 