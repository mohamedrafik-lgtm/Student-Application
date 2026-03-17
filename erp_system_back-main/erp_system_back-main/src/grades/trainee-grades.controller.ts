import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { GradesService } from './grades.service';

/**
 * Controller مخصص لعرض الدرجات في منصة المتدربين
 * مفتوح مؤقتاً بدون authentication للاختبار
 */
@Controller('trainee-grades')
export class TraineeGradesController {
  constructor(private readonly gradesService: GradesService) {}

  // جلب الدرجات المعلنة للمتدرب
  @Get(':traineeId/released')
  async getTraineeReleasedGrades(@Param('traineeId', ParseIntPipe) traineeId: number) {
    return this.gradesService.getTraineeReleasedGrades(traineeId);
  }

  // جلب درجات الرأفة المطبقة على المتدرب
  @Get(':traineeId/mercy-grades')
  async getTraineeMercyGrades(@Param('traineeId', ParseIntPipe) traineeId: number) {
    return this.gradesService.getTraineeMercyGrades(traineeId);
  }
}
