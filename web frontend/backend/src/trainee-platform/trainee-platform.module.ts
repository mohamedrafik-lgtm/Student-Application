import { Module, forwardRef } from '@nestjs/common';
import { TraineePlatformController } from './trainee-platform.controller';
import { TraineePlatformService } from './trainee-platform.service';
import { TraineePaymentStatusService } from './trainee-payment-status.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { TraineeAuthModule } from '../trainee-auth/trainee-auth.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SettingsModule } from '../settings/settings.module';
import { DisciplinaryActionsModule } from '../disciplinary-actions/disciplinary-actions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    PermissionsModule,
    forwardRef(() => TraineeAuthModule),
    WhatsAppModule,
    SettingsModule,
    forwardRef(() => DisciplinaryActionsModule),
    UsersModule,
  ],
  controllers: [TraineePlatformController],
  providers: [TraineePlatformService, TraineePaymentStatusService],
  exports: [TraineePlatformService, TraineePaymentStatusService],
})
export class TraineePlatformModule {}
