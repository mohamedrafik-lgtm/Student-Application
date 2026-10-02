import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new question' })
  @ApiResponse({ status: 201, description: 'The question has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createQuestionDto: CreateQuestionDto, @Req() req) {
    // Añadir el ID del usuario que crea la pregunta
    return this.questionsService.create({
      ...createQuestionDto,
      createdById: req.user.userId,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all questions' })
  @ApiResponse({ status: 200, description: 'Return all questions.' })
  findAll() {
    return this.questionsService.findAll();
  }

  @Get('content/:contentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get questions by content ID' })
  @ApiResponse({ status: 200, description: 'Return questions by content ID.' })
  findByContentId(
    @Param('contentId') contentId: string,
    @Query('excludeUsedInPaperExams') excludeUsedInPaperExams?: string,
  ) {
    const excludeUsed = excludeUsedInPaperExams === 'true';
    return this.questionsService.findByContentId(+contentId, excludeUsed);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a question by ID' })
  @ApiResponse({ status: 200, description: 'Return a question by ID.' })
  @ApiResponse({ status: 404, description: 'Question not found.' })
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a question' })
  @ApiResponse({ status: 200, description: 'The question has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Question not found.' })
  update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
    return this.questionsService.update(+id, updateQuestionDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a question' })
  @ApiResponse({ status: 200, description: 'The question has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Question not found.' })
  remove(@Param('id') id: string) {
    return this.questionsService.remove(+id);
  }
} 