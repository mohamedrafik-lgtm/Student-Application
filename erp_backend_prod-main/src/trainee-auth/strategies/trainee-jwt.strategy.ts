import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TraineeJwtStrategy extends PassportStrategy(Strategy, 'trainee-jwt') {
  constructor(private configService: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // التأكد من أن التوكن خاص بمتدرب
    if (payload.type !== 'trainee') {
      throw new UnauthorizedException('غير مصرح للوصول');
    }

    if (!payload.sessionToken) {
      throw new UnauthorizedException('جلسة المتدرب غير صالحة. يرجى تسجيل الدخول مرة أخرى.');
    }

    const [account, session] = await Promise.all([
      this.prisma.traineeAuth.findUnique({ where: { id: payload.sub }, select: { id: true, nationalId: true, traineeId: true, isActive: true } }),
      this.prisma.traineeTrackingSession.findUnique({ where: { sessionToken: payload.sessionToken }, select: { id: true, traineeAuthId: true, isActive: true, lastHeartbeatAt: true } }),
    ]);
    const staleBefore = Date.now() - 2 * 60 * 1000;
    if (!account?.isActive || !session || !session.isActive || session.traineeAuthId !== account.id || session.lastHeartbeatAt.getTime() < staleBefore) {
      if (session?.isActive && session.lastHeartbeatAt.getTime() < staleBefore) {
        await this.prisma.traineeTrackingSession.update({
          where: { id: session.id },
          data: { isActive: false, logoutAt: session.lastHeartbeatAt, logoutType: 'EXPIRED' },
        }).catch(() => undefined);
      }
      throw new UnauthorizedException('انتهت جلسة المتدرب أو لم تعد صالحة. يرجى تسجيل الدخول مرة أخرى.');
    }

    return {
      userId: payload.sub,
      nationalId: account.nationalId,
      traineeId: account.traineeId,
      sessionToken: payload.sessionToken,
      type: payload.type,
    };
  }
}
