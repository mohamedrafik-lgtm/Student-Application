import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      callback(null, true);
    },
    credentials: true,
  },
  namespace: '/crm-inbox',
})
export class CrmInboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CrmInboxGateway.name);
  // تتبع المستخدمين المتصلين: userId -> Set<socketId>
  private connectedUsers = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      client.userId = payload.sub;
      client.userName = payload.name;

      // إضافة للمتصلين
      if (!this.connectedUsers.has(payload.sub)) {
        this.connectedUsers.set(payload.sub, new Set());
      }
      this.connectedUsers.get(payload.sub)!.add(client.id);

      // انضمام تلقائي لغرفة المستخدم الشخصية
      client.join(`user:${payload.sub}`);
      // غرفة عامة لجميع مستخدمي CRM
      client.join('crm:all');

      this.logger.log(`✅ CRM Inbox: ${payload.name} connected`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId) return;

    const userSockets = this.connectedUsers.get(client.userId);
    if (userSockets) {
      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(client.userId);
      }
    }

    this.logger.log(`🔴 CRM Inbox: ${client.userName} disconnected`);
  }

  // ===== أحداث يتم بثها من الخدمة =====

  /** رسالة جديدة وصلت من واتساب */
  notifyNewMessage(conversationId: string, message: any, conversation: any) {
    this.server.to('crm:all').emit('message:new', {
      conversationId,
      message,
      conversation,
    });
  }

  /** محادثة جديدة أُنشئت */
  notifyNewConversation(conversation: any) {
    this.server.to('crm:all').emit('conversation:new', { conversation });
  }

  /** محادثة تم حجزها */
  notifyConversationClaimed(conversationId: string, claimedByUserId: string, claimedByName: string) {
    this.server.to('crm:all').emit('conversation:claimed', {
      conversationId,
      claimedByUserId,
      claimedByName,
    });
  }

  /** محادثة تم تحرير حجزها */
  notifyConversationReleased(conversationId: string) {
    this.server.to('crm:all').emit('conversation:released', { conversationId });
  }

  /** محادثة تم إغلاقها */
  notifyConversationClosed(conversationId: string) {
    this.server.to('crm:all').emit('conversation:closed', { conversationId });
  }

  /** رسالة صادرة تم إرسالها (لإبلاغ باقي المتصفحات) */
  notifyOutboundMessage(conversationId: string, message: any, senderUserId: string) {
    // إرسال لجميع المتصلين ما عدا المرسل ذاته (أو لنرسل للكل ويتجاهل المرسل محلياً)
    this.server.to('crm:all').emit('message:outbound', {
      conversationId,
      message,
      senderUserId,
    });
  }
}
