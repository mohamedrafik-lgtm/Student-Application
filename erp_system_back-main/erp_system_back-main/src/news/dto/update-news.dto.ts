import { PartialType } from '@nestjs/mapped-types';
import { CreateNewsDto } from './create-news.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNewsDto extends PartialType(CreateNewsDto) {
  @ApiProperty({
    description: 'News article title (optional)',
    example: 'Updated training program announced',
    required: false
  })
  title?: string;

  @ApiProperty({
    description: 'News article content (optional)',
    example: 'Tiba Training Center has updated its new training program...',
    required: false
  })
  content?: string;

  @ApiProperty({
    description: 'Short excerpt of the news content (optional)',
    example: 'Tiba Training Center updates program',
    required: false
  })
  excerpt?: string;

  @ApiProperty({
    description: 'Image path or URL for the news article (optional)',
    example: 'updated-news-image.jpg',
    required: false
  })
  image?: string;

  @ApiProperty({
    description: 'Author of the news article (optional)',
    example: 'Admin User',
    required: false
  })
  author?: string;

  @ApiProperty({
    description: 'URL-friendly slug for the news article (optional)',
    example: 'updated-training-program-announced',
    required: false
  })
  slug?: string;

  @ApiProperty({
    description: 'Whether the news article is published (optional)',
    example: true,
    required: false
  })
  isPublished?: boolean;
}