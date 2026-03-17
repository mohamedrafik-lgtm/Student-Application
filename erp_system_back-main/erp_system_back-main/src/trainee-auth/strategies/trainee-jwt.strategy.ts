import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TraineeJwtStrategy extends PassportStrategy(Strategy, 'trainee-jwt') {
  constructor(private configService: ConfigService) {
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

    return {
      userId: payload.sub,
      nationalId: payload.nationalId,
      traineeId: payload.traineeId,
      type: payload.type,
    };
  }
}
