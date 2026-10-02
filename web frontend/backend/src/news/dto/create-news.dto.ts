import { IsNotEmpty, IsOptional, IsString, IsUrl, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNewsDto {
  @ApiProperty({
    description: 'News article title',
    example: 'New training program announced'
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'News article content (full text)',
    example: 'Tiba Training Center is proud to announce a new training program...'
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Short excerpt of the news content',
    example: 'Tiba Training Center announces new program'
  })
  @IsNotEmpty()
  @IsString()
  excerpt: string;

  @ApiProperty({
    description: 'Image path or URL for the news article',
    example: 'news-image.jpg'
  })
  @IsNotEmpty()
  @IsString()
  image: string;

  @ApiProperty({
    description: 'Author of the news article',
    example: 'Admin User'
  })
  @IsNotEmpty()
  @IsString()
  author: string;

  @ApiProperty({
    description: 'URL-friendly slug for the news article',
    example: 'new-training-program-announced'
  })
  @IsNotEmpty()
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Whether the news article is published',
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}