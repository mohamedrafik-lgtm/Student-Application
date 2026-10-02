import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [LocationsController],
  providers: [LocationsService, PrismaService],
  exports: [LocationsService],
})
export class LocationsModule {}