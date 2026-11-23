import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnlineTrackingService } from './online-tracking.service';
import { HeartbeatDto } from './dto/heartbeat.dto';

@Controller('online-tracking')
@UseGuards(JwtAuthGuard)
export class OnlineTrackingController {
  constructor(private readonly onlineTrackingService: OnlineTrackingService) {}

  @Post('heartbeat')
  async heartbeat(@Req() req: any, @Body() dto: HeartbeatDto) {
    const user = req.user;
    await this.onlineTrackingService.heartbeat(
      {
        userId: user.userId,
        name: user.name,
        email: user.email,
        photoUrl: dto.photoUrl || null,
        accountType: user.accountType,
      },
      dto.page,
    );
    return { success: true };
  }

  @Get('online-users')
  async getOnlineUsers() {
    const users = await this.onlineTrackingService.getOnlineUsers();
    return { users, count: users.length };
  }

  @Get('all-users-presence')
  async getAllUsersPresence() {
    const users = await this.onlineTrackingService.getAllUsersWithPresence();
    const onlineCount = users.filter(u => u.isOnline).length;
    return { users, onlineCount, totalCount: users.length };
  }

  @Post('logout')
  async logout(@Req() req: any) {
    await this.onlineTrackingService.removeUser(req.user.userId);
    return { success: true };
  }
}
