import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TraineeLocalAuthGuard extends AuthGuard('trainee-local') {}
