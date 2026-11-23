import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainingProgramsService {
  constructor(private prisma: PrismaService) {}

  // الحصول على جميع البرامج التدريبية
  async findAll(allowedProgramIds?: number[]) {
    return this.prisma.trainingProgram.findMany({
      where: allowedProgramIds ? { id: { in: allowedProgramIds } } : undefined,
      orderBy: { nameAr: 'asc' },
    });
  }

  // الحصول على برنامج بالمعرف
  async findOne(id: number) {
    const program = await this.prisma.trainingProgram.findUnique({
      where: { id },
    });

    if (!program) {
      throw new NotFoundException(`البرنامج التدريبي بالمعرف ${id} غير موجود`);
    }

    return program;
  }
}
