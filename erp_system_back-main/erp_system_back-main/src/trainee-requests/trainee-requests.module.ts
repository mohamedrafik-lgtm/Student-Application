import { Module } from '@nestjs/common';
import { TraineeRequestsController } from './trainee-requests.controller';
import { TraineeRequestsService } from './trainee-requests.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, PermissionsModule, UsersModule],
  controllers: [TraineeRequestsController],
  providers: [TraineeRequestsService],
  exports: [TraineeRequestsService],
})
export class TraineeRequestsModule {}