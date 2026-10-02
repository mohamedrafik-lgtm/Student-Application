import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { WhatsAppService } from './whatsapp.service';
import { DatabaseWhatsAppService } from './database-whatsapp.service';
import { UnifiedWhatsAppService } from './unified-whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppQueueService } from './whatsapp-queue.service';
import { WhatsAppCampaignsService } from './campaigns.service';
import { MessageTemplatesService } from './templates.service';
import { WhatsAppCampaignsController } from './campaigns.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { SettingsModule } from '../settings/settings.module';
import { SettingsService } from '../settings/settings.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { PdfModule } from '../pdf/pdf.module';
import { PdfGeneratorService } from '../pdf/pdf-generator.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuditModule,
    SettingsModule,
    PermissionsModule,
    PdfModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [WhatsAppController, WhatsAppCampaignsController],
  providers: [
    // Conditional Provider - إنشاء فقط الخدمة المطلوبة
    {
      provide: 'ACTIVE_WHATSAPP_SERVICE',
      useFactory: (prisma, audit, settings, pdf) => {
        const storageType = process.env.WHATSAPP_STORAGE_TYPE || 'database';
        
        if (storageType === 'database') {
          const { DatabaseWhatsAppService } = require('./database-whatsapp.service');
          return new DatabaseWhatsAppService(prisma, audit, settings, pdf);
        } else {
          const { WhatsAppService } = require('./whatsapp.service');
          return new WhatsAppService(prisma, audit, settings, pdf);
        }
      },
      inject: [PrismaService, AuditService, SettingsService, PdfGeneratorService],
    },
    
    // Dummy providers (لن يتم استخدامها مباشرة)
    {
      provide: WhatsAppService,
      useFactory: () => {
        // Dummy - لن يتم instantiate
        return null;
      },
    },
    {
      provide: DatabaseWhatsAppService,
      useFactory: () => {
        // Dummy - لن يتم instantiate
        return null;
      },
    },
    
    UnifiedWhatsAppService,
    WhatsAppQueueService, 
    WhatsAppCampaignsService, 
    MessageTemplatesService,
  ],
  exports: [
    'ACTIVE_WHATSAPP_SERVICE', // الخدمة النشطة (Database أو File)
    WhatsAppService,           // للاستخدام المباشر إذا لزم الأمر
    DatabaseWhatsAppService,   // للاستخدام المباشر إذا لزم الأمر
    UnifiedWhatsAppService,    // ✨ الخدمة الموحدة - المفضلة
    WhatsAppQueueService, 
    WhatsAppCampaignsService, 
    MessageTemplatesService,
  ],
})
export class WhatsAppModule {}