import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PdfQuestionsService } from './pdf-questions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('pdf-questions')
@Controller('pdf-questions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PdfQuestionsController {
  constructor(private readonly pdfQuestionsService: PdfQuestionsService) {}

  @Post('extract')
  @ApiOperation({ summary: 'استخراج أسئلة من PDF' })
  async extractQuestions(@Body() data: {
    pdfBase64: string;
    questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'BOTH';
  }) {
    const questions = await this.pdfQuestionsService.extractQuestionsFromPDF(
      data.pdfBase64,
      data.questionType
    );
    return { questions };
  }
}