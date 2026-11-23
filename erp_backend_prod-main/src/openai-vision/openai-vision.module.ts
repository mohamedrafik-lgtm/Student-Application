import { Module } from '@nestjs/common';
import { OpenAIVisionService } from './openai-vision.service';
import { OpenAIVisionController } from './openai-vision.controller';
import { DeveloperSettingsModule } from '../developer-settings/developer-settings.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PermissionGuard } from '../permissions/guards/permission.guard';

@Module({
  imports: [DeveloperSettingsModule, PermissionsModule],
  providers: [OpenAIVisionService, PermissionGuard],
  controllers: [OpenAIVisionController],
  exports: [OpenAIVisionService],
})
export class OpenAIVisionModule {}
