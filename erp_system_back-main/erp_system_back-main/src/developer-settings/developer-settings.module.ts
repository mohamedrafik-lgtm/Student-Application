import { Module } from '@nestjs/common';
import { DeveloperSettingsController } from './developer-settings.controller';
import { DeveloperSettingsService } from './developer-settings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [DeveloperSettingsController],
  providers: [DeveloperSettingsService],
  exports: [DeveloperSettingsService],
})
export class DeveloperSettingsModule {}
