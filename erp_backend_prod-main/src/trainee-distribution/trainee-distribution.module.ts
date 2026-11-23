import { Module } from '@nestjs/common';
import { TraineeDistributionService } from './trainee-distribution.service';
import { TraineeDistributionController } from './trainee-distribution.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [TraineeDistributionController],
  providers: [TraineeDistributionService],
  exports: [TraineeDistributionService],
})
export class TraineeDistributionModule {}
