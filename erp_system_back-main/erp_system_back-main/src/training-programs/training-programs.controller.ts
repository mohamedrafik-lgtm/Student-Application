import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { TrainingProgramsService } from './training-programs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserProgramAccessService } from '../users/user-program-access.service';

@Controller('training-programs')
@UseGuards(JwtAuthGuard)
export class TrainingProgramsController {
  constructor(
    private readonly trainingProgramsService: TrainingProgramsService,
    private readonly userProgramAccessService: UserProgramAccessService,
  ) {}

  // الحصول على جميع البرامج التدريبية
  @Get()
  async findAll(@Request() req) {
    const allowedProgramIds = await this.userProgramAccessService.getAllowedProgramIds(req.user.userId);
    const programs = await this.trainingProgramsService.findAll(allowedProgramIds.length > 0 ? allowedProgramIds : undefined);
    return {
      success: true,
      programs,
    };
  }

  // الحصول على برنامج بالمعرف
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const program = await this.trainingProgramsService.findOne(parseInt(id));
    return {
      success: true,
      program,
    };
  }
}
