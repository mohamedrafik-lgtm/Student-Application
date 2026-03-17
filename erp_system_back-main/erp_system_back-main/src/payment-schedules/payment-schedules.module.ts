import { Module } from '@nestjs/common';
import { PaymentSchedulesController } from './payment-schedules.controller';
import { PaymentSchedulesService } from './payment-schedules.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentSchedulesController],
  providers: [PaymentSchedulesService],
  exports: [PaymentSchedulesService],
})
export class PaymentSchedulesModule {}