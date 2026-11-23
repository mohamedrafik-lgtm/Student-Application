import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrmWhatsAppService } from '../crm-whatsapp/crm-whatsapp.service';
import { CrmInboxGateway } from './crm-inbox.gateway';
import * as path from 'path';
import * as fs from 'fs';
import { execFileSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

@Injectable()
export class CrmInboxService {
  private readonly logger = new Logger(CrmInboxService.name);

  constructor(
    private prisma: PrismaService,
    private crmWhatsApp: CrmWhatsAppService,
    private gateway: CrmInboxGateway,
  ) {}

  // ===== إعدادات التوزيع =====

  async getSettings() {
    let settings = await this.prisma.crmMessageSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.crmMessageSettings.create({
        data: { distributionMode: 'disabled' }
      });
    }
    return settings;
  }

  async updateSettings(distributionMode: string, userId: string) {
    const validModes = ['disabled', 'round_robin', 'first_claim'];
    if (!validModes.includes(distributionMode)) {
      throw new Error('وضع توزيع غير صالح');
    }

    let settings = await this.prisma.crmMessageSettings.findFirst();
    if (settings) {
      return await this.prisma.crmMessageSettings.update({
        where: { id: settings.id },
        data: { distributionMode, updatedBy: userId }
      });
    } else {
      return await this.prisma.crmMessageSettings.create({
        data: { distributionMode, updatedBy: userId }
      });
    }
  }

  // ===== المحادثات =====

  async getConversations(userId: string, filter: string = 'all') {
    const where: any = {};

    switch (filter) {
      case 'unassigned':
      default:
        where.assignedToId = null;
        where.status = { not: 'closed' };
        break;
      case 'mine':
        where.assignedToId = userId;
        where.status = { not: 'closed' };
        break;
      case 'closed':
        where.status = 'closed';
        break;
    }

    const conversations = await this.prisma.crmConversation.findMany({
      where,
      include: {
        channel: { select: { id: true, name: true, phoneNumber: true } },
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    });

    // جلب أسماء الموظفين المعينين
    const assignedIds = conversations
      .map(c => c.assignedToId)
      .filter((id): id is string => !!id);

    let assignedUsers: Record<string, string> = {};
    if (assignedIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: assignedIds } },
        select: { id: true, name: true }
      });
      assignedUsers = Object.fromEntries(users.map(u => [u.id, u.name]));
    }

    return conversations.map(c => ({
      ...c,
      assignedToName: c.assignedToId ? assignedUsers[c.assignedToId] || null : null,
    }));
  }

  async getMessages(conversationId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.crmMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.crmMessage.count({ where: { conversationId } }),
    ]);

    return { messages, total, page, limit };
  }

  async sendMessage(conversationId: string, content: string, userId: string) {
    const conversation = await this.prisma.crmConversation.findUnique({
      where: { id: conversationId },
      include: { channel: true }
    });

    if (!conversation) throw new Error('المحادثة غير موجودة');
    if (!conversation.channel) throw new Error('القناة غير موجودة');

    // إرسال عبر واتساب
    const sent = await this.crmWhatsApp.sendMessage(
      conversation.channelId,
      conversation.customerPhone,
      content,
    );

    if (!sent) throw new Error('فشل في إرسال الرسالة');

    // حفظ الرسالة الصادرة
    const message = await this.prisma.crmMessage.create({
      data: {
        conversationId,
        direction: 'outbound',
        messageType: 'text',
        content,
        sentById: userId,
      }
    });

    // تحديث المحادثة
    await this.prisma.crmConversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content,
        lastMessageAt: new Date(),
      }
    });

    // إبلاغ باقي المتصلين بالرسالة الصادرة
    this.gateway.notifyOutboundMessage(conversationId, message, userId);

    return message;
  }

  async sendMediaMessage(
    conversationId: string,
    userId: string,
    file: Express.Multer.File,
    mediaType: 'image' | 'audio',
    caption?: string,
  ) {
    const conversation = await this.prisma.crmConversation.findUnique({
      where: { id: conversationId },
      include: { channel: true },
    });
    if (!conversation) throw new Error('المحادثة غير موجودة');
    if (!conversation.channel) throw new Error('القناة غير موجودة');

    // حفظ الملف
    const dirPath = path.join(process.cwd(), 'uploads', 'crm-media', conversation.channelId);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const baseFileName = `out_${Date.now()}`;
    const ext = file.originalname.split('.').pop() || (mediaType === 'image' ? 'jpg' : 'webm');
    const origFileName = `${baseFileName}.${ext}`;
    const origFilePath = path.join(dirPath, origFileName);
    fs.writeFileSync(origFilePath, file.buffer);

    let mediaUrl = `/uploads/crm-media/${conversation.channelId}/${origFileName}`;
    let mediaMimeType = file.mimetype;
    let whatsappBase64 = file.buffer.toString('base64');
    let whatsappMimetype = file.mimetype;

    // تحويل WebM → OGG Opus للإرسال عبر واتساب + MP3 للمتصفح
    if (mediaType === 'audio' && (ext === 'webm' || file.mimetype.includes('webm'))) {
      const bin = ffmpegPath || 'ffmpeg';
      // تحويل إلى OGG Opus لواتساب (صيغة الرسائل الصوتية المطلوبة)
      const oggPath = path.join(dirPath, `${baseFileName}.ogg`);
      try {
        execFileSync(bin, [
          '-i', origFilePath,
          '-codec:a', 'libopus',
          '-b:a', '48k',
          '-y', oggPath,
        ], { timeout: 15000, stdio: 'pipe' });
        whatsappBase64 = fs.readFileSync(oggPath).toString('base64');
        whatsappMimetype = 'audio/ogg; codecs=opus';
        try { fs.unlinkSync(oggPath); } catch {} // حذف OGG المؤقت بعد القراءة
      } catch (e) {
        this.logger.warn(`⚠️ WebM→OGG conversion failed: ${e.message}`);
      }
      // تحويل إلى MP3 للتشغيل في المتصفح
      const mp3Path = path.join(dirPath, `${baseFileName}.mp3`);
      try {
        execFileSync(bin, [
          '-i', origFilePath,
          '-codec:a', 'libmp3lame',
          '-qscale:a', '4',
          '-y', mp3Path,
        ], { timeout: 15000, stdio: 'pipe' });
        mediaUrl = `/uploads/crm-media/${conversation.channelId}/${baseFileName}.mp3`;
        mediaMimeType = 'audio/mpeg';
        try { fs.unlinkSync(origFilePath); } catch {} // حذف WebM الأصلي بعد التحويل
      } catch (e) {
        this.logger.warn(`⚠️ WebM→MP3 conversion failed: ${e.message}`);
      }
    }

    // إرسال عبر واتساب
    const sent = await this.crmWhatsApp.sendMediaMessage(
      conversation.channelId,
      conversation.customerPhone,
      mediaType,
      whatsappBase64,
      whatsappMimetype,
      caption,
    );
    if (!sent) throw new Error('فشل في إرسال الملف');

    // حفظ الرسالة
    const message = await this.prisma.crmMessage.create({
      data: {
        conversationId,
        direction: 'outbound',
        messageType: mediaType,
        content: caption || null,
        mediaUrl,
        mediaMimeType,
        mediaFileName: file.originalname,
        sentById: userId,
      },
    });

    // تحديث المحادثة
    const lastMsg = mediaType === 'image' ? (caption || '📷 صورة') : '🎤 رسالة صوتية';
    await this.prisma.crmConversation.update({
      where: { id: conversationId },
      data: { lastMessage: lastMsg, lastMessageAt: new Date() },
    });

    this.gateway.notifyOutboundMessage(conversationId, message, userId);
    return message;
  }

  // ===== حجز المحادثات =====

  async claimConversation(conversationId: string, userId: string) {
    // قفل متفائل: لن يتم التحديث إلا إذا كانت المحادثة غير محجوزة
    const result = await this.prisma.crmConversation.updateMany({
      where: {
        id: conversationId,
        OR: [
          { assignedToId: null },
          { assignedToId: userId }, // السماح لنفس المستخدم بإعادة الحجز
        ],
      },
      data: { assignedToId: userId, status: 'assigned' }
    });

    if (result.count === 0) {
      throw new Error('المحادثة محجوزة لموظف آخر بالفعل');
    }

    // جلب اسم المستخدم
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    // إبلاغ الجميع فوراً
    this.gateway.notifyConversationClaimed(conversationId, userId, user?.name || '');

    return await this.prisma.crmConversation.findUnique({ where: { id: conversationId } });
  }

  async releaseConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.crmConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) throw new Error('المحادثة غير موجودة');

    const updated = await this.prisma.crmConversation.update({
      where: { id: conversationId },
      data: { assignedToId: null, status: 'open' }
    });

    // إبلاغ الجميع فوراً
    this.gateway.notifyConversationReleased(conversationId);

    return updated;
  }

  async closeConversation(conversationId: string) {
    const updated = await this.prisma.crmConversation.update({
      where: { id: conversationId },
      data: { status: 'closed' }
    });

    // إبلاغ الجميع فوراً
    this.gateway.notifyConversationClosed(conversationId);

    return updated;
  }

  async markAsRead(conversationId: string) {
    return await this.prisma.crmConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 }
    });
  }
}
