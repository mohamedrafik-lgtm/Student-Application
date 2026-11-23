import { Module } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { ProgramsController } from './programs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PermissionGuard } from '../permissions/guards/permission.guard';

@Module({
  imports: [PrismaModule, AuditModule, UsersModule, PermissionsModule],
  controllers: [ProgramsController],
  providers: [ProgramsService, PermissionGuard],
  exports: [ProgramsService],
})
export class ProgramsModule {}
