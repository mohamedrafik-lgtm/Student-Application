import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentRemindersService } from './payment-reminders.service';
import { PaymentRemindersSchedulerService } from './payment-reminders-scheduler.service';
import { PaymentRemindersController } from './payment-reminders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // تفعيل Cron Jobs
    PrismaModule,
    AuditModule,
    WhatsAppModule,
    PermissionsModule,
    UsersModule,
  ],
  controllers: [PaymentRemindersController],
  providers: [
    PaymentRemindersService,
    PaymentRemindersSchedulerService,
  ],
  exports: [
    PaymentRemindersService,
    PaymentRemindersSchedulerService,
  ],
})
export class PaymentRemindersModule {}