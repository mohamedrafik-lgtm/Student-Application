import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SettingsModule } from '../settings/settings.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserProgramAccessService } from './user-program-access.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, AuditModule, forwardRef(() => WhatsAppModule), SettingsModule, PermissionsModule, UploadModule],
  controllers: [UsersController],
  providers: [UsersService, UserProgramAccessService],
  exports: [UsersService, UserProgramAccessService],
})
export class UsersModule {}