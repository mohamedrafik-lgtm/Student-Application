import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TraineeJwtAuthGuard extends AuthGuard('trainee-jwt') {}
