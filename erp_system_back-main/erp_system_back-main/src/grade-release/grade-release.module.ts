import { Module } from '@nestjs/common';
import { GradeReleaseController } from './grade-release.controller';
import { GradeReleaseService } from './grade-release.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [GradeReleaseController],
  providers: [GradeReleaseService],
  exports: [GradeReleaseService],
})
export class GradeReleaseModule {}
