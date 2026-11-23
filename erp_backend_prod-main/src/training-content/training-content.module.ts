import { Module } from '@nestjs/common';
import { TrainingContentService } from './training-content.service';
import { TrainingContentController } from './training-content.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, AuditModule, UsersModule],
  controllers: [TrainingContentController],
  providers: [TrainingContentService],
  exports: [TrainingContentService],
})
export class TrainingContentModule {} 