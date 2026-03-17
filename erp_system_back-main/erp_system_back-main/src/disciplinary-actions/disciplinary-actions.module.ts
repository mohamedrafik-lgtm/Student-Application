import { Module } from '@nestjs/common';
import { DisciplinaryActionsController } from './disciplinary-actions.controller';
import { DisciplinaryActionsService } from './disciplinary-actions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, PermissionsModule, UsersModule],
  controllers: [DisciplinaryActionsController],
  providers: [DisciplinaryActionsService],
  exports: [DisciplinaryActionsService], // للاستخدام في modules أخرى
})
export class DisciplinaryActionsModule {}