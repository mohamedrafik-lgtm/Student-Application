import { Module, forwardRef } from '@nestjs/common';
import { CrmWhatsAppService } from './crm-whatsapp.service';
import { CrmWhatsAppController } from './crm-whatsapp.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CrmInboxModule } from '../crm-inbox/crm-inbox.module';

@Module({
  imports: [PrismaModule, PermissionsModule, forwardRef(() => CrmInboxModule)],
  controllers: [CrmWhatsAppController],
  providers: [CrmWhatsAppService],
  exports: [CrmWhatsAppService],
})
export class CrmWhatsAppModule {}
