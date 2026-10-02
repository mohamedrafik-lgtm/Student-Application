import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StorageSettingsService, MigrationProgress } from './storage-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('إعدادات التخزين')
@ApiBearerAuth()
@Controller('storage-settings')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class StorageSettingsController {
  constructor(private readonly storageSettingsService: StorageSettingsService) {}

  @Get()
  @RequirePermission('dashboard.developer-settings', 'view')
  async getConfig() {
    return this.storageSettingsService.getStorageConfigSafe();
  }

  @Put()
  @RequirePermission('dashboard.developer-settings', 'manage')
  async saveConfig(
    @Body() body: { storageMode: 'cloud' | 'local'; cloudName?: string; apiKey?: string; apiSecret?: string },
  ) {
    return this.storageSettingsService.saveStorageConfig(body);
  }

  @Get('analyze')
  @RequirePermission('dashboard.developer-settings', 'view')
  async analyzeCloudImages() {
    return this.storageSettingsService.analyzeCloudImages();
  }

  @Get('analyze-local')
  @RequirePermission('dashboard.developer-settings', 'view')
  async analyzeLocalFiles() {
    return this.storageSettingsService.analyzeLocalFiles();
  }

  @Post('migrate-to-local')
  @RequirePermission('dashboard.developer-settings', 'manage')
  async migrateToLocal() {
    return this.storageSettingsService.migrateCloudToLocal();
  }

  @Post('migrate-to-cloud')
  @RequirePermission('dashboard.developer-settings', 'manage')
  async migrateToCloud() {
    return this.storageSettingsService.migrateLocalToCloud();
  }

  @Get('migration-progress')
  @RequirePermission('dashboard.developer-settings', 'view')
  async getMigrationProgress(): Promise<MigrationProgress> {
    return this.storageSettingsService.getMigrationProgress();
  }
}


