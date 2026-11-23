import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { UploadService } from '../upload/upload.service';
import { memoryStorage } from 'multer';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
    private uploadService: UploadService,
  ) {}

  /** جلب محادثات المستخدم */
  @Get('conversations')
  getConversations(@Request() req: any) {
    return this.chatService.getUserConversations(req.user.userId);
  }

  /** إنشاء أو استرداد محادثة خاصة */
  @Post('conversations/private')
  getOrCreatePrivate(@Request() req: any, @Body('otherUserId') otherUserId: string) {
    return this.chatService.getOrCreatePrivateConversation(req.user.userId, otherUserId);
  }

  /** إنشاء محادثة جماعية */
  @Post('conversations/group')
  createGroup(
    @Request() req: any,
    @Body() body: { name: string; memberIds: string[] },
  ) {
    return this.chatService.createGroupConversation(req.user.userId, body.name, body.memberIds);
  }

  /** جلب رسائل محادثة */
  @Get('conversations/:id/messages')
  getMessages(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      conversationId,
      req.user.userId,
      cursor,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /** إرسال رسالة نصية عبر REST */
  @Post('conversations/:id/messages')
  async sendMessage(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() body: { content: string },
  ) {
    const message = await this.chatService.sendMessage(conversationId, req.user.userId, {
      content: body.content,
    });
    // إرسال الإشعار عبر WebSocket
    await this.chatGateway.notifyNewMessage(conversationId, message);
    return message;
  }

  /** حذف رسالة */
  @Delete('messages/:id')
  deleteMessage(@Request() req: any, @Param('id') messageId: string) {
    return this.chatService.deleteMessage(messageId, req.user.userId);
  }

  /** تحديث وقت آخر قراءة */
  @Post('conversations/:id/read')
  markAsRead(@Request() req: any, @Param('id') conversationId: string) {
    return this.chatService.markConversationAsRead(conversationId, req.user.userId);
  }

  /** جلب كل المستخدمين */
  @Get('users')
  getUsers(@Request() req: any, @Query('search') search?: string) {
    return this.chatService.getAllUsers(req.user.userId, search);
  }

  /** رفع ملف للمحادثة (صورة/صوت/ملف) */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.uploadService.uploadFile(file, 'avatars');
    return result;
  }
}
