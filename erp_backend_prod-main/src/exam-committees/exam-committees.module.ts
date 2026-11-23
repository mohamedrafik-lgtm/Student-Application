import { Module } from '@nestjs/common';
import { ExamCommitteesService } from './exam-committees.service';
import { ExamCommitteesController } from './exam-committees.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, AuditModule, PermissionsModule],
  controllers: [ExamCommitteesController],
  providers: [ExamCommitteesService],
  exports: [ExamCommitteesService],
})
export class ExamCommitteesModule {}
