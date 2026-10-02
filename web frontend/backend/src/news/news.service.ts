import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { toJsonValue } from '../lib/utils';

@Injectable()
export class NewsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createNewsDto: CreateNewsDto, userId: string) {
    const news = await this.prisma.news.create({
      data: createNewsDto,
    });

    await this.auditService.log({
      action: AuditAction.CREATE,
      entity: 'News',
      entityId: String(news.id),
      userId,
      details: { message: `Created news with title: ${news.title}` },
    });

    return news;
  }

  async findAll() {
    return this.prisma.news.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new NotFoundException(`Invalid news ID format`);
    }
    
    const news = await this.prisma.news.findUnique({
      where: { id: numericId },
    });

    if (!news) {
      throw new NotFoundException(`News with ID ${id} not found`);
    }

    return news;
  }

  async update(id: string, updateNewsDto: UpdateNewsDto, userId: string) {
    const before = await this.findOne(id);
    const numericId = parseInt(id, 10);

    const after = await this.prisma.news.update({
      where: { id: numericId },
      data: updateNewsDto,
    });

    await this.auditService.log({
      action: AuditAction.UPDATE,
      entity: 'News',
      entityId: id,
      userId,
      details: toJsonValue({ before, after }),
    });

    return after;
  }

  async remove(id: string, userId: string) {
    const news = await this.findOne(id);
    const numericId = parseInt(id, 10);

    await this.prisma.news.delete({
      where: { id: numericId },
    });

    await this.auditService.log({
      action: AuditAction.DELETE,
      entity: 'News',
      entityId: id,
      userId,
      details: toJsonValue({ message: `Deleted news: ${news.title}`, deletedData: news }),
    });

    return { message: 'News deleted successfully' };
  }
}