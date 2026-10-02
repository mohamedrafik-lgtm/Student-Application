import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, ConfigModule, WhatsAppModule, UsersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
