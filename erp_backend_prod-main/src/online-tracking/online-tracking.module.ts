import { Module } from '@nestjs/common';
import { OnlineTrackingController } from './online-tracking.controller';
import { OnlineTrackingService } from './online-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OnlineTrackingController],
  providers: [OnlineTrackingService],
  exports: [OnlineTrackingService],
})
export class OnlineTrackingModule {}
