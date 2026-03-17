import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceService } from './attendance.service';
import { AttendanceAutoCompleteService } from './attendance-auto-complete.service';
import { AttendanceController } from './attendance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { TraineePlatformModule } from '../trainee-platform/trainee-platform.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    PermissionsModule,
    forwardRef(() => TraineePlatformModule),
    UsersModule
  ],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceAutoCompleteService,
  ],
  exports: [
    AttendanceService,
    AttendanceAutoCompleteService,
  ],
})
export class AttendanceModule {}
