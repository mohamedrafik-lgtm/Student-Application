import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('recent')
  async findRecent(@Query('limit') limit: string = '5') {
    const limitNum = parseInt(limit, 10);
    
    const logs = await this.auditService.findRecent(limitNum);
    
    return logs;
  }

  @Get()
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '20') {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const logs = await this.auditService.findAll({
      skip,
      take: limitNum,
    });
    
    // In a real app, you'd also want to return total count for pagination
    return {
      message: "سجلات التدقيق تم جلبها بنجاح",
      logs,
    };
  }
} 