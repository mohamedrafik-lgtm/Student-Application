import { Module } from '@nestjs/common';
import { IdCardDesignsService } from './id-card-designs.service';
import { IdCardDesignsController } from './id-card-designs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IdCardDesignsController],
  providers: [IdCardDesignsService],
  exports: [IdCardDesignsService],
})
export class IdCardDesignsModule {}
