import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { MinistryExamDeclarationsController } from './ministry-exam-declarations.controller';
import { MinistryExamDeclarationsService } from './ministry-exam-declarations.service';

@Module({
  imports: [PrismaModule, PermissionsModule, UsersModule],
  controllers: [MinistryExamDeclarationsController],
  providers: [MinistryExamDeclarationsService],
  exports: [MinistryExamDeclarationsService],
})
export class MinistryExamDeclarationsModule {}
