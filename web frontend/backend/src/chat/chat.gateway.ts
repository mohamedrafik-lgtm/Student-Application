import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // نفس منطق CORS الموجود في main.ts
      if (!origin) return callback(null, true);
      callback(null, true);
    },
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  // تتبع المستخدمين المتصلين: userId -> Set<socketId>
  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private chatService: ChatService,
  ) {}

  /** التحقق من التوكن عند الاتصال */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      client.userId = payload.sub;
      client.userName = payload.name;

      // إضافة للمتصلين
      if (!this.onlineUsers.has(payload.sub)) {
        this.onlineUsers.set(payload.sub, new Set());
      }
      this.onlineUsers.get(payload.sub)!.add(client.id);

      // الانضمام لغرف المحادثات
      const conversations = await this.chatService.getUserConversations(payload.sub);
      for (const conv of conversations) {
        client.join(`conv:${conv.id}`);
      }

      // إبلاغ الآخرين بأن المستخدم متصل
      this.server.emit('user:online', { userId: payload.sub });

      // تحديث آخر ظهور
      await this.chatService.updateLastSeen(payload.sub);

      this.logger.log(`✅ User ${payload.name} (${payload.sub}) connected`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  /** معالجة قطع الاتصال */
  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId) return;

    const userSockets = this.onlineUsers.get(client.userId);
    if (userSockets) {
      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.onlineUsers.delete(client.userId);
        // إبلاغ الآخرين بأن المستخدم غير متصل
        this.server.emit('user:offline', { userId: client.userId });
        // تحديث آخر ظهور
        await this.chatService.updateLastSeen(client.userId);
      }
    }

    this.logger.log(`🔴 User ${client.userName} disconnected`);
  }

  /** إرسال رسالة */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      type?: 'TEXT' | 'IMAGE' | 'VOICE' | 'FILE';
      content?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      duration?: number;
    },
  ) {
    if (!client.userId) return;

    try {
      const message = await this.chatService.sendMessage(
        data.conversationId,
        client.userId,
        data,
      );

      // التأكد من أن جميع المشاركين موجودين في الغرفة
      await this.ensureParticipantsInRoom(data.conversationId);

      // إرسال الرسالة لكل المشاركين في المحادثة
      this.server.to(`conv:${data.conversationId}`).emit('message:new', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Message send error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /** مؤشر الكتابة */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    client.to(`conv:${data.conversationId}`).emit('typing:update', {
      userId: client.userId,
      userName: client.userName,
      conversationId: data.conversationId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    client.to(`conv:${data.conversationId}`).emit('typing:update', {
      userId: client.userId,
      userName: client.userName,
      conversationId: data.conversationId,
      isTyping: false,
    });
  }

  /** تحديث وقت القراءة */
  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    await this.chatService.markConversationAsRead(data.conversationId, client.userId);
    this.server.to(`conv:${data.conversationId}`).emit('message:read', {
      userId: client.userId,
      conversationId: data.conversationId,
    });
  }

  /** الانضمام لمحادثة جديدة */
  @SubscribeMessage('conversation:join')
  handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conv:${data.conversationId}`);
  }

  /** جلب قائمة المتصلين */
  @SubscribeMessage('users:online')
  handleGetOnlineUsers() {
    return { onlineUserIds: Array.from(this.onlineUsers.keys()) };
  }

  /** التأكد من أن جميع المشاركين في المحادثة موجودين في الغرفة */
  private async ensureParticipantsInRoom(conversationId: string) {
    const participantIds = await this.chatService.getConversationParticipantIds(conversationId);
    const roomName = `conv:${conversationId}`;

    for (const userId of participantIds) {
      const userSockets = this.onlineUsers.get(userId);
      if (userSockets) {
        for (const socketId of userSockets) {
          const allSockets = await this.server.fetchSockets();
          const remoteSocket = allSockets.find((s) => s.id === socketId);
          if (remoteSocket && !remoteSocket.rooms.has(roomName)) {
            remoteSocket.join(roomName);
          }
        }
      }
    }
  }

  /** إرسال رسالة جديدة عبر REST (يستدعيها الـ controller) */
  async notifyNewMessage(conversationId: string, message: any) {
    await this.ensureParticipantsInRoom(conversationId);
    this.server.to(`conv:${conversationId}`).emit('message:new', message);
  }
}
