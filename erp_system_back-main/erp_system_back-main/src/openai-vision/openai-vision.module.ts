import { Module } from '@nestjs/common';
import { OpenAIVisionService } from './openai-vision.service';
import { OpenAIVisionController } from './openai-vision.controller';
import { DeveloperSettingsModule } from '../developer-settings/developer-settings.module';

@Module({
  imports: [DeveloperSettingsModule],
  providers: [OpenAIVisionService],
  controllers: [OpenAIVisionController],
  exports: [OpenAIVisionService],
})
export class OpenAIVisionModule {}