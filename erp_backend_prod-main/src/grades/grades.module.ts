import { Module } from '@nestjs/common';
import { GradesController } from './grades.controller';
import { TraineeGradesController } from './trainee-grades.controller';
import { GradesService } from './grades.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TraineeAuthModule } from '../trainee-auth/trainee-auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, TraineeAuthModule, PermissionsModule, UsersModule],
  controllers: [GradesController, TraineeGradesController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}

