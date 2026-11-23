import { Module } from '@nestjs/common';
import { GoogleVisionService } from './google-vision.service';
import { GoogleVisionController } from './google-vision.controller';

@Module({
  providers: [GoogleVisionService],
  controllers: [GoogleVisionController],
  exports: [GoogleVisionService],
})
export class GoogleVisionModule {}