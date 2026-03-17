import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { GradeAppealsController } from './grade-appeals.controller';
import { GradeAppealsService } from './grade-appeals.service';
import { UsersModule } from '../users/users.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, PermissionsModule, UsersModule, forwardRef(() => WhatsAppModule)],
  controllers: [GradeAppealsController],
  providers: [GradeAppealsService],
  exports: [GradeAppealsService],
})
export class GradeAppealsModule {}
