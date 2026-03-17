import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, PermissionsModule, UsersModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
