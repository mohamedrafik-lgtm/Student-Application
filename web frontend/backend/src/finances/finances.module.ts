import { Module, forwardRef } from '@nestjs/common';
import { FinancesService } from './finances.service';
import { FinancesController } from './finances.controller';
import { FinancialAuditService } from './financial-audit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule, 
    forwardRef(() => WhatsAppModule),
    UsersModule
  ],
  controllers: [FinancesController],
  providers: [FinancesService, FinancialAuditService],
  exports: [FinancesService, FinancialAuditService],
})
export class FinancesModule {} 