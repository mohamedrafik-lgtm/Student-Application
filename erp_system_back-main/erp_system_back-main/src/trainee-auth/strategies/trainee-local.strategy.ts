import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TraineeAuthService } from '../trainee-auth.service';

@Injectable()
export class TraineeLocalStrategy extends PassportStrategy(Strategy, 'trainee-local') {
  constructor(private traineeAuthService: TraineeAuthService) {
    super({ usernameField: 'nationalId' }); // استخدام الرقم القومي بدلاً من email
  }

  async validate(nationalId: string, password: string): Promise<any> {
    const traineeAuth = await this.traineeAuthService.validateTrainee(nationalId, password);
    if (!traineeAuth) {
      throw new UnauthorizedException('بيانات تسجيل الدخول غير صحيحة');
    }
    return traineeAuth;
  }
}
