import { Module } from '@nestjs/common';
import { IdCardsService } from './id-cards.service';
import { IdCardsController } from './id-cards.controller';
import { BulkDownloadService } from './bulk-download.service';
import { BulkDownloadController } from './bulk-download.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { IdCardDesignsModule } from '../id-card-designs/id-card-designs.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, IdCardDesignsModule, UsersModule],
  controllers: [IdCardsController, BulkDownloadController],
  providers: [IdCardsService, BulkDownloadService],
  exports: [IdCardsService, BulkDownloadService],
})
export class IdCardsModule {} 