import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { OpenAIVisionService } from './openai-vision.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('openai-vision')
@Controller('openai-vision')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OpenAIVisionController {
  constructor(private readonly openaiVisionService: OpenAIVisionService) {}

  @Post('analyze-omr')
  @ApiOperation({ summary: 'تحليل ورقة OMR باستخدام OpenAI Vision' })
  async analyzeOMR(@Body() data: {
    imageBase64: string;
    numberOfQuestions: number;
  }) {
    return this.openaiVisionService.analyzeOMRSheet(
      data.imageBase64,
      data.numberOfQuestions
    );
  }

  @Post('chat')
  @ApiOperation({ summary: 'محادثة مع Vision AI' })
  async chatWithVisionAI(@Body() data: {
    message: string;
    conversationHistory?: Array<{ role: string; content: string }>;
  }) {
    const reply = await this.openaiVisionService.chatWithVisionAI(
      data.message,
      data.conversationHistory || []
    );
    return { reply };
  }

  @Post('extract-questions-text')
  @ApiOperation({ summary: 'استخراج أسئلة من نص' })
  async extractQuestionsFromText(@Body() data: {
    textContent: string;
    questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'BOTH';
  }) {
    const questions = await this.openaiVisionService.extractQuestionsFromText(
      data.textContent,
      data.questionType
    );
    return { questions };
  }

  @Post('extract-national-id')
  @ApiOperation({ summary: 'استخراج الرقم القومي من صورة OMR' })
  async extractNationalId(@Body() data: {
    imageBase64: string;
  }) {
    const nationalId = await this.openaiVisionService.extractNationalIdFromImage(
      data.imageBase64
    );
    return { nationalId };
  }

  @Post('analyze-omr-with-national-id')
  @ApiOperation({ summary: 'تحليل ورقة OMR كامل: استخراج الرقم القومي والإجابات معاً' })
  async analyzeOMRWithNationalId(@Body() data: {
    imageBase64: string;
    numberOfQuestions: number;
  }) {
    const result = await this.openaiVisionService.analyzeOMRWithNationalId(
      data.imageBase64,
      data.numberOfQuestions
    );
    
    console.log('\n🔥🔥🔥 Controller - قبل الإرسال للـ Frontend:');
    console.log('  nationalId:', result.nationalId);
    console.log('  answers count:', result.answers?.length || 0);
    console.log('  answers[0]:', result.answers?.[0]);
    console.log('  answers[1]:', result.answers?.[1]);
    console.log('  Full result:', JSON.stringify(result, null, 2));
    console.log('🔥🔥🔥\n');
    
    return result;
  }
}