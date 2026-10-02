import { Module, forwardRef } from '@nestjs/common';
import { TraineesService } from './trainees.service';
import { TraineesController } from './trainees.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { FinancesModule } from '../finances/finances.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, AuditModule, forwardRef(() => FinancesModule), forwardRef(() => WhatsAppModule), UsersModule],
  controllers: [TraineesController],
  providers: [TraineesService],
  exports: [TraineesService],
})
export class TraineesModule {}