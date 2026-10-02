import { Module } from '@nestjs/common';
import { DeferralRequestsController } from './deferral-requests.controller';
import { DeferralRequestsService } from './deferral-requests.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { TraineeAuthModule } from '../trainee-auth/trainee-auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    PermissionsModule,
    TraineeAuthModule,
    UsersModule,
  ],
  controllers: [DeferralRequestsController],
  providers: [DeferralRequestsService],
  exports: [DeferralRequestsService],
})
export class DeferralRequestsModule {}