import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new news article' })
  @ApiBody({ type: CreateNewsDto })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'The news article has been successfully created.' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input data.' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized.' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Forbidden resource. Admin role required.' 
  })
  create(@Body() createNewsDto: CreateNewsDto, @Request() req) {
    return this.newsService.create(createNewsDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all news articles' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Return all news articles.' 
  })
  findAll() {
    return this.newsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a news article by id' })
  @ApiParam({ name: 'id', description: 'News article ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Return the news article.' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'News article not found.' 
  })
  findOne(@Param('id') id: string) {
    return this.newsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a news article' })
  @ApiParam({ name: 'id', description: 'News article ID' })
  @ApiBody({ type: UpdateNewsDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'The news article has been successfully updated.' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input data.' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'News article not found.' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized.' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Forbidden resource. Admin role required.' 
  })
  update(
    @Param('id') id: string,
    @Body() updateNewsDto: UpdateNewsDto,
    @Request() req,
  ) {
    return this.newsService.update(id, updateNewsDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a news article' })
  @ApiParam({ name: 'id', description: 'News article ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'The news article has been successfully deleted.' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'News article not found.' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Unauthorized.' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Forbidden resource. Admin role required.' 
  })
  remove(@Param('id') id: string, @Request() req) {
    return this.newsService.remove(id, req.user.userId);
  }
}