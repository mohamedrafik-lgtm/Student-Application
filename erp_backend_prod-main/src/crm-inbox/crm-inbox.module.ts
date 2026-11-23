import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CrmInboxService } from './crm-inbox.service';
import { CrmInboxController } from './crm-inbox.controller';
import { CrmInboxGateway } from './crm-inbox.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CrmWhatsAppModule } from '../crm-whatsapp/crm-whatsapp.module';

@Module({
  imports: [
    PrismaModule,
    PermissionsModule,
    forwardRef(() => CrmWhatsAppModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [CrmInboxController],
  providers: [CrmInboxService, CrmInboxGateway],
  exports: [CrmInboxService, CrmInboxGateway],
})
export class CrmInboxModule {}
