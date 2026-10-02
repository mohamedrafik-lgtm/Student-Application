import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MemoryMonitorService } from './memory-monitor.service';

@Module({
  controllers: [HealthController],
  providers: [MemoryMonitorService],
  exports: [MemoryMonitorService],
})
export class HealthModule {}
