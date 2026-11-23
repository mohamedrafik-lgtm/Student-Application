import { Module, Global } from '@nestjs/common';
import { RedisLocalService } from './redis-local.service';

@Global()
@Module({
  providers: [RedisLocalService],
  exports: [RedisLocalService],
})
export class RedisModule {}
