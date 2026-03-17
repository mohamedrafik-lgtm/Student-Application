import { Module } from '@nestjs/common';
import { PdfQuestionsController } from './pdf-questions.controller';
import { PdfQuestionsService } from './pdf-questions.service';

@Module({
  controllers: [PdfQuestionsController],
  providers: [PdfQuestionsService],
  exports: [PdfQuestionsService],
})
export class PdfQuestionsModule {}