import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { UploadModule } from '../upload/upload.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TechnicalReportsController } from './technical-reports.controller';
import { TechnicalReportsService } from './technical-reports.service';

@Module({
  imports: [PrismaModule, PermissionsModule, UploadModule],
  controllers: [TechnicalReportsController],
  providers: [TechnicalReportsService],
})
export class TechnicalReportsModule {}
