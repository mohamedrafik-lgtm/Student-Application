import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StaffAttendanceController } from './staff-attendance.controller';
import { StaffAttendanceService } from './staff-attendance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    PermissionsModule,
  ],
  controllers: [StaffAttendanceController],
  providers: [StaffAttendanceService],
  exports: [StaffAttendanceService],
})
export class StaffAttendanceModule {}
