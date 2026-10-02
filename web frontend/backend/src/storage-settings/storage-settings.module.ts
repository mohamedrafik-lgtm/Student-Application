import { Module } from '@nestjs/common';
import { StorageSettingsController } from './storage-settings.controller';
import { StorageSettingsService } from './storage-settings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [StorageSettingsController],
  providers: [StorageSettingsService],
  exports: [StorageSettingsService],
})
export class StorageSettingsModule {}
