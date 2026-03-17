import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { GoogleVisionService } from './google-vision.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('google-vision')
@Controller('google-vision')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleVisionController {
  constructor(private readonly googleVisionService: GoogleVisionService) {}

  @Post('analyze-omr')
  @ApiOperation({ summary: 'تحليل ورقة OMR باستخدام Google Cloud Vision OCR' })
  async analyzeOMR(@Body() data: {
    imageBase64: string;
    numberOfQuestions: number;
    questionData: Array<{ questionNumber: number; options: any[] }>
  }) {
    return this.googleVisionService.analyzeAnswerSheet(
      data.imageBase64,
      data.numberOfQuestions,
      data.questionData
    );
  }

  @Post('detect-text')
  @ApiOperation({ summary: 'التعرف على النصوص في الصورة' })
  async detectText(@Body() data: { imageBase64: string }) {
    return this.googleVisionService.detectAllText(data.imageBase64);
  }
}