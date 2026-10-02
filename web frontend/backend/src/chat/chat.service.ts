import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationType, ChatMessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private prisma: PrismaService) {}

  // ========== المحادثات ==========

  /** جلب كل المحادثات للمستخدم */
  async getUserConversations(userId: string) {
    const conversations = await this.prisma.chatConversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, photoUrl: true, accountType: true, lastSeenAt: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // حساب الرسائل غير المقروءة لكل محادثة
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find((p) => p.userId === userId);
        const unreadCount = participant?.lastReadAt
          ? await this.prisma.chatMessage.count({
              where: {
                conversationId: conv.id,
                createdAt: { gt: participant.lastReadAt },
                senderId: { not: userId },
                isDeleted: false,
              },
            })
          : await this.prisma.chatMessage.count({
              where: {
                conversationId: conv.id,
                senderId: { not: userId },
                isDeleted: false,
              },
            });

        return { ...conv, unreadCount };
      }),
    );

    return result;
  }

  /** إنشاء أو استرداد محادثة خاصة */
  async getOrCreatePrivateConversation(userId: string, otherUserId: string) {
    // البحث عن محادثة خاصة موجودة
    const existing = await this.prisma.chatConversation.findFirst({
      where: {
        type: ConversationType.PRIVATE,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, photoUrl: true, accountType: true, lastSeenAt: true },
            },
          },
        },
      },
    });

    if (existing) return existing;

    // إنشاء محادثة جديدة
    return this.prisma.chatConversation.create({
      data: {
        type: ConversationType.PRIVATE,
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, photoUrl: true, accountType: true, lastSeenAt: true },
            },
          },
        },
      },
    });
  }

  /** إنشاء محادثة جماعية */
  async createGroupConversation(userId: string, name: string, memberIds: string[]) {
    const allMembers = [...new Set([userId, ...memberIds])];

    return this.prisma.chatConversation.create({
      data: {
        type: ConversationType.GROUP,
        name,
        participants: {
          create: allMembers.map((id) => ({
            userId: id,
            isAdmin: id === userId,
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, photoUrl: true, accountType: true, lastSeenAt: true },
            },
          },
        },
      },
    });
  }

  // ========== الرسائل ==========

  /** جلب رسائل محادثة مع pagination */
  async getMessages(conversationId: string, userId: string, cursor?: string, limit = 50) {
    // التحقق من أن المستخدم مشارك
    await this.ensureParticipant(conversationId, userId);

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId, isDeleted: false },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, photoUrl: true } },
        readBy: { select: { userId: true, readAt: true } },
      },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    return {
      messages: messages.reverse(),
      hasMore,
      nextCursor: hasMore ? messages[0]?.id : null,
    };
  }

  /** إرسال رسالة */
  async sendMessage(
    conversationId: string,
    senderId: string,
    data: {
      type?: ChatMessageType;
      content?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      duration?: number;
    },
  ) {
    await this.ensureParticipant(conversationId, senderId);

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId,
        type: data.type || ChatMessageType.TEXT,
        content: data.content,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        duration: data.duration,
      },
      include: {
        sender: { select: { id: true, name: true, photoUrl: true } },
        readBy: { select: { userId: true, readAt: true } },
      },
    });

    // تحديث آخر رسالة في المحادثة
    const previewText =
      data.type === ChatMessageType.IMAGE
        ? '📷 صورة'
        : data.type === ChatMessageType.VOICE
          ? '🎤 رسالة صوتية'
          : data.type === ChatMessageType.FILE
            ? `📎 ${data.fileName || 'ملف'}`
            : data.content?.substring(0, 100) || '';

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), lastMessageText: previewText },
    });

    return message;
  }

  /** حذف رسالة (soft delete) */
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('الرسالة غير موجودة');
    if (message.senderId !== userId) throw new ForbiddenException('لا يمكنك حذف هذه الرسالة');

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });
  }

  // ========== القراءة والتتبع ==========

  /** تحديث وقت آخر قراءة */
  async markConversationAsRead(conversationId: string, userId: string) {
    await this.prisma.chatParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  // ========== المستخدمون ==========

  /** جلب كل المستخدمين (للبحث وإنشاء محادثات) */
  async getAllUsers(currentUserId: string, search?: string) {
    return this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isArchived: false,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        accountType: true,
        lastSeenAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /** تحديث آخر ظهور للمستخدم */
  async updateLastSeen(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  }

  // ========== مساعد ==========

  private async ensureParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });
    if (!participant) throw new ForbiddenException('أنت لست مشاركاً في هذه المحادثة');
    return participant;
  }

  /** جلب معرفات المشاركين في محادثة */
  async getConversationParticipantIds(conversationId: string): Promise<string[]> {
    const participants = await this.prisma.chatParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return participants.map((p) => p.userId);
  }
}
