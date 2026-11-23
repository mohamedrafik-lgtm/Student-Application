import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { OpenAIVisionService } from './openai-vision.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@ApiTags('openai-vision')
@Controller('openai-vision')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OpenAIVisionController {
  constructor(private readonly openaiVisionService: OpenAIVisionService) {}

  @Post('analyze-omr')
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'تحليل ورقة OMR باستخدام OpenRouter' })
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
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.vision-ai', 'view')
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
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'create')
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
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
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
  @UseGuards(PermissionGuard)
  @RequirePermission('dashboard.paper-exams', 'grade')
  @ApiOperation({ summary: 'تحليل ورقة OMR كامل: استخراج الرقم القومي والإجابات معاً' })
  async analyzeOMRWithNationalId(@Body() data: {
    imageBase64: string;
    numberOfQuestions: number;
  }) {
    const result = await this.openaiVisionService.analyzeOMRWithNationalId(
      data.imageBase64,
      data.numberOfQuestions
    );
    
    console.log(`OpenRouter OMR result: nationalId=${result.nationalId ? 'present' : 'missing'}, answers=${result.answers?.length || 0}`);
    
    return result;
  }
}
