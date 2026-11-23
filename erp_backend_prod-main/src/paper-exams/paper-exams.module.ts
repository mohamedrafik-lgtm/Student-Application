import { Module } from '@nestjs/common';
import { PaperExamsService } from './paper-exams.service';
import { PaperExamsController } from './paper-exams.controller';
import { BatchGradingService } from './batch-grading.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PermissionGuard } from '../permissions/guards/permission.guard';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [PaperExamsController],
  providers: [PaperExamsService, BatchGradingService, PermissionGuard],
  exports: [PaperExamsService],
})
export class PaperExamsModule {}
