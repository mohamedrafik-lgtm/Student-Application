import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'emailOrPhone' });
  }

  async validate(emailOrPhone: string, password: string): Promise<any> {
    try {
      const user = await this.authService.validateUser(emailOrPhone, password);
      if (!user) {
        throw new UnauthorizedException('بيانات تسجيل الدخول غير صحيحة');
      }
      return user;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error; // تمرير خطأ الأرشفة كما هو
      }
      throw new UnauthorizedException('بيانات تسجيل الدخول غير صحيحة');
    }
  }
}