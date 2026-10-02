import { Module } from '@nestjs/common';
import { SecondRoundFeesController } from './second-round-fees.controller';
import { SecondRoundFeesService } from './second-round-fees.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, PermissionsModule, UsersModule],
  controllers: [SecondRoundFeesController],
  providers: [SecondRoundFeesService],
})
export class SecondRoundFeesModule {}
