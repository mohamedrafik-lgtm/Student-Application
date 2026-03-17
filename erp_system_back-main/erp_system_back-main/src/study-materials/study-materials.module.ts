import { Module } from '@nestjs/common';
import { StudyMaterialsService } from './study-materials.service';
import { StudyMaterialsController } from './study-materials.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [StudyMaterialsController],
  providers: [StudyMaterialsService],
  exports: [StudyMaterialsService],
})
export class StudyMaterialsModule {}

