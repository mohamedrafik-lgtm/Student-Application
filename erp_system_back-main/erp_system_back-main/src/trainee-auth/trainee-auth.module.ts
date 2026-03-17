import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TraineeAuthService } from './trainee-auth.service';
import { TraineeAuthController } from './trainee-auth.controller';
import { TraineeJwtStrategy } from './strategies/trainee-jwt.strategy';
import { TraineeLocalStrategy } from './strategies/trainee-local.strategy';
import { SessionTrackingService } from './session-tracking.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { SettingsModule } from '../settings/settings.module';
import { AuditModule } from '../audit/audit.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    PassportModule,
    WhatsAppModule,
    SettingsModule,
    AuditModule,
    forwardRef(() => AttendanceModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '30d'), // 30 يوم للمتدربين
        },
      }),
    }),
  ],
  controllers: [TraineeAuthController],
  providers: [TraineeAuthService, SessionTrackingService, TraineeJwtStrategy, TraineeLocalStrategy],
  exports: [TraineeAuthService, SessionTrackingService],
})
export class TraineeAuthModule {}
