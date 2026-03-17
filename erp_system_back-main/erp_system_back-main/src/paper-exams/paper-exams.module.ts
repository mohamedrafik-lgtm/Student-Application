import { Module } from '@nestjs/common';
import { PaperExamsService } from './paper-exams.service';
import { PaperExamsController } from './paper-exams.controller';
import { BatchGradingService } from './batch-grading.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaperExamsController],
  providers: [PaperExamsService, BatchGradingService],
  exports: [PaperExamsService],
})
export class PaperExamsModule {}