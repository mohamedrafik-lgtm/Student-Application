import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrmInboxGateway } from '../crm-inbox/crm-inbox.gateway';
import { spawn, ChildProcess, execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ffmpeg-static يوفر مسار ffmpeg المدمج
let ffmpegPath: string | null = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch { /* لم يتم تثبيته */ }

export interface CrmWhatsAppChannelStatus {
  id: string;
  name: string;
  isReady: boolean;
  isConnected: boolean;
  qrCode?: string;
  pairCode?: string;
  phoneNumber?: string;
  status: string;
}

interface ChannelProcess {
  process: ChildProcess;
  channelId: string;
  isReady: boolean;
  isConnected: boolean;
  phoneNumber: string | null;
  qrCode: string | null;
  pairCode: string | null;
}

@Injectable()
export class CrmWhatsAppService {
  private readonly logger = new Logger(CrmWhatsAppService.name);
  private channelProcesses: Map<string, ChannelProcess> = new Map();

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => CrmInboxGateway)) private gateway: CrmInboxGateway,
  ) {
    this.restoreConnectedChannels();
  }

  /**
   * استعادة القنوات المتصلة سابقاً عند بدء التشغيل
   */
  private async restoreConnectedChannels() {
    try {
      const connectedChannels = await this.prisma.crmWhatsAppChannel.findMany({
        where: { status: 'connected' }
      });

      for (const channel of connectedChannels) {
        this.logger.log(`🔄 CRM: Restoring channel ${channel.name} (${channel.id})`);
        await this.startChannelProcess(channel.id);
      }
    } catch (error) {
      this.logger.error('Failed to restore CRM WhatsApp channels:', error.message);
    }
  }

  /**
   * الحصول على جميع القنوات
   */
  async getChannels() {
    const channels = await this.prisma.crmWhatsAppChannel.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return channels.map(channel => {
      const proc = this.channelProcesses.get(channel.id);
      return {
        ...channel,
        isReady: proc?.isReady || false,
        isConnected: proc?.isConnected || false,
        qrCode: proc?.qrCode || null,
        pairCode: proc?.pairCode || null,
        livePhoneNumber: proc?.phoneNumber || channel.phoneNumber,
      };
    });
  }

  /**
   * إنشاء قناة جديدة
   */
  async createChannel(name: string, userId: string) {
    const channel = await this.prisma.crmWhatsAppChannel.create({
      data: {
        name,
        status: 'disconnected',
        createdBy: String(userId),
      }
    });

    this.logger.log(`✅ CRM: Channel created: ${channel.id} (${name})`);
    return channel;
  }

  /**
   * بدء اتصال قناة عبر QR Code
   */
  async connectChannelWithQR(channelId: string) {
    const channel = await this.prisma.crmWhatsAppChannel.findUnique({
      where: { id: channelId }
    });
    if (!channel) throw new Error('القناة غير موجودة');

    // تحديث حالة القناة
    await this.prisma.crmWhatsAppChannel.update({
      where: { id: channelId },
      data: { status: 'connecting' }
    });

    await this.startChannelProcess(channelId, false, null);

    // انتظار QR Code (حتى 20 ثانية)
    let attempts = 0;
    while (attempts < 40) {
      const proc = this.channelProcesses.get(channelId);
      if (proc?.qrCode) {
        return { success: true, qrCode: proc.qrCode };
      }
      if (proc?.isConnected) {
        return { success: true, connected: true, phoneNumber: proc.phoneNumber };
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    return { success: false, message: 'لم يتم توليد QR Code. حاول مرة أخرى.' };
  }

  /**
   * بدء اتصال قناة عبر Pair Code
   */
  async connectChannelWithPairCode(channelId: string, phoneNumber: string) {
    const channel = await this.prisma.crmWhatsAppChannel.findUnique({
      where: { id: channelId }
    });
    if (!channel) throw new Error('القناة غير موجودة');

    await this.prisma.crmWhatsAppChannel.update({
      where: { id: channelId },
      data: { status: 'connecting' }
    });

    await this.startChannelProcess(channelId, true, phoneNumber);

    // انتظار Pair Code (حتى 20 ثانية)
    let attempts = 0;
    while (attempts < 40) {
      const proc = this.channelProcesses.get(channelId);
      if (proc?.pairCode) {
        return { success: true, pairCode: proc.pairCode };
      }
      if (proc?.isConnected) {
        return { success: true, connected: true, phoneNumber: proc.phoneNumber };
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    return { success: false, message: 'لم يتم توليد كود الإقران. حاول مرة أخرى.' };
  }

  /**
   * قطع اتصال قناة
   */
  async disconnectChannel(channelId: string) {
    const proc = this.channelProcesses.get(channelId);
    
    if (proc?.process?.connected) {
      proc.process.send({ command: 'clear-sessions' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      proc.process.send({ command: 'shutdown' });
      
      setTimeout(() => {
        try { proc.process.kill(); } catch (e) { /* تجاهل */ }
      }, 5000);
    }

    // تنظيف الجلسات من قاعدة البيانات
    await this.prisma.crmWhatsAppSession.deleteMany({
      where: { channelId }
    });

    // تحديث حالة القناة
    await this.prisma.crmWhatsAppChannel.update({
      where: { id: channelId },
      data: { 
        status: 'disconnected', 
        phoneNumber: null,
        disconnectedAt: new Date() 
      }
    });

    this.channelProcesses.delete(channelId);
    this.logger.log(`✅ CRM: Channel ${channelId} disconnected`);
    
    return { success: true };
  }

  /**
   * حذف قناة بالكامل
   */
  async deleteChannel(channelId: string) {
    // قطع الاتصال أولاً
    await this.disconnectChannel(channelId).catch(() => {});
    
    // حذف القناة (cascade يحذف الجلسات)
    await this.prisma.crmWhatsAppChannel.delete({
      where: { id: channelId }
    });

    this.logger.log(`🗑️ CRM: Channel ${channelId} deleted`);
    return { success: true };
  }

  /**
   * الحصول على حالة قناة محددة
   */
  async getChannelStatus(channelId: string): Promise<CrmWhatsAppChannelStatus> {
    const channel = await this.prisma.crmWhatsAppChannel.findUnique({
      where: { id: channelId }
    });
    if (!channel) throw new Error('القناة غير موجودة');

    const proc = this.channelProcesses.get(channelId);

    return {
      id: channel.id,
      name: channel.name,
      isReady: proc?.isReady || false,
      isConnected: proc?.isConnected || false,
      qrCode: proc?.qrCode || undefined,
      pairCode: proc?.pairCode || undefined,
      phoneNumber: proc?.phoneNumber || channel.phoneNumber || undefined,
      status: channel.status,
    };
  }

  /**
   * إعادة توليد QR Code
   */
  async regenerateQR(channelId: string) {
    // إيقاف العملية الحالية
    await this.stopChannelProcess(channelId);
    
    // تنظيف الجلسات
    await this.prisma.crmWhatsAppSession.deleteMany({
      where: { channelId }
    });

    // تحديث الحالة
    await this.prisma.crmWhatsAppChannel.update({
      where: { id: channelId },
      data: { status: 'connecting' }
    });

    // بدء عملية جديدة
    return this.connectChannelWithQR(channelId);
  }

  /**
   * إرسال رسالة عبر قناة محددة
   */
  async sendMessage(channelId: string, phoneNumber: string, message: string): Promise<boolean> {
    const proc = this.channelProcesses.get(channelId);
    if (!proc?.isConnected || !proc.process?.connected) {
      throw new Error('القناة غير متصلة');
    }

    this.logger.log(`📤 CRM: Sending message via channel ${channelId} to ${phoneNumber}`);

    const result = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        proc.process.off('message', handler);
        reject(new Error('Timeout: لم يتم الرد خلال 30 ثانية'));
      }, 30000);

      const handler = (msg: any) => {
        if (msg.type === 'message-result') {
          clearTimeout(timeout);
          proc.process.off('message', handler);
          if (msg.data.success) {
            this.logger.log(`✅ CRM: Message sent successfully. Key: ${msg.data.messageKey}`);
          } else {
            this.logger.error(`❌ CRM: Message send failed: ${msg.data.error}`);
          }
          resolve(msg.data.success);
        } else if (msg.type === 'error') {
          clearTimeout(timeout);
          proc.process.off('message', handler);
          this.logger.error(`❌ CRM: IPC error: ${msg.data.error}`);
          resolve(false);
        }
      };

      proc.process.on('message', handler);
      proc.process.send({
        command: 'send-message',
        data: { phoneNumber, message }
      });
    });

    return result;
  }

  /**
   * إرسال رسالة ميديا عبر قناة محددة
   */
  async sendMediaMessage(
    channelId: string,
    phoneNumber: string,
    mediaType: 'image' | 'audio',
    mediaBase64: string,
    mimetype: string,
    caption?: string,
  ): Promise<boolean> {
    const proc = this.channelProcesses.get(channelId);
    if (!proc?.isConnected || !proc.process?.connected) {
      throw new Error('القناة غير متصلة');
    }

    this.logger.log(`📤 CRM: Sending ${mediaType} via channel ${channelId} to ${phoneNumber}`);

    const result = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        proc.process.off('message', handler);
        reject(new Error('Timeout'));
      }, 30000);

      const handler = (msg: any) => {
        if (msg.type === 'message-result') {
          clearTimeout(timeout);
          proc.process.off('message', handler);
          resolve(msg.data.success);
        } else if (msg.type === 'error') {
          clearTimeout(timeout);
          proc.process.off('message', handler);
          resolve(false);
        }
      };

      proc.process.on('message', handler);
      proc.process.send({
        command: 'send-media',
        data: { phoneNumber, mediaType, mediaBase64, mimetype, caption },
      });
    });

    return result;
  }

  // ===== Private Methods =====

  private async startChannelProcess(channelId: string, usePairCode = false, phoneNumber: string | null = null) {
    // إيقاف العملية الحالية إذا كانت موجودة
    await this.stopChannelProcess(channelId);

    let wrapperPath = path.join(__dirname, 'crm-baileys-wrapper.mjs');
    if (!fs.existsSync(wrapperPath)) {
      wrapperPath = path.join(__dirname, '..', '..', '..', 'src', 'crm-whatsapp', 'crm-baileys-wrapper.mjs');
    }
    if (!fs.existsSync(wrapperPath)) {
      wrapperPath = path.join(process.cwd(), 'src', 'crm-whatsapp', 'crm-baileys-wrapper.mjs');
    }
    if (!fs.existsSync(wrapperPath)) {
      throw new Error(`CRM Baileys wrapper not found. Last tried: ${wrapperPath}`);
    }

    this.logger.log(`📁 CRM: Using wrapper at: ${wrapperPath}`);

    const childProcess = spawn('node', [wrapperPath], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });

    const channelProc: ChannelProcess = {
      process: childProcess,
      channelId,
      isReady: false,
      isConnected: false,
      phoneNumber: null,
      qrCode: null,
      pairCode: null,
    };

    this.channelProcesses.set(channelId, channelProc);

    childProcess.on('message', (message: any) => {
      this.handleChannelMessage(channelId, message);
    });

    childProcess.stdout?.on('data', (data) => {
      this.logger.debug(`CRM [${channelId}]: ${data.toString().trim()}`);
    });

    childProcess.stderr?.on('data', (data) => {
      this.logger.error(`CRM [${channelId}] error: ${data.toString().trim()}`);
    });

    childProcess.on('exit', (code) => {
      this.logger.warn(`CRM [${channelId}] process exited with code ${code}`);
      const proc = this.channelProcesses.get(channelId);
      if (proc) {
        proc.isReady = false;
        proc.isConnected = false;
      }
    });

    // إرسال أمر التهيئة
    childProcess.send({
      command: 'initialize',
      data: { channelId, usePairCode, phoneNumber }
    });
  }

  private async stopChannelProcess(channelId: string) {
    const proc = this.channelProcesses.get(channelId);
    if (proc?.process) {
      try {
        if (proc.process.connected) {
          proc.process.send({ command: 'shutdown' });
        }
        setTimeout(() => {
          try { proc.process.kill(); } catch (e) { /* تجاهل */ }
        }, 3000);
      } catch (e) { /* تجاهل */ }
    }
    this.channelProcesses.delete(channelId);
  }

  private handleChannelMessage(channelId: string, message: any) {
    const proc = this.channelProcesses.get(channelId);
    if (!proc) return;

    const { type, data } = message;

    switch (type) {
      case 'qr':
        proc.qrCode = data.qrCode;
        proc.isReady = false;
        this.logger.log(`📱 CRM [${channelId}]: QR Code generated`);
        break;

      case 'pair-code':
        proc.pairCode = data.pairCode;
        this.logger.log(`📱 CRM [${channelId}]: Pair code generated: ${data.pairCode}`);
        break;

      case 'ready':
        proc.isReady = true;
        proc.isConnected = true;
        proc.phoneNumber = data.phoneNumber;
        proc.qrCode = null;
        proc.pairCode = null;
        this.logger.log(`✅ CRM [${channelId}]: Connected! Phone: ${data.phoneNumber}`);
        break;

      case 'disconnected':
        proc.isConnected = false;
        proc.isReady = false;
        this.logger.warn(`❌ CRM [${channelId}]: Disconnected`);
        break;

      case 'logged-out':
        proc.isConnected = false;
        proc.isReady = false;
        proc.phoneNumber = null;
        proc.qrCode = null;
        this.logger.warn(`🚪 CRM [${channelId}]: Logged out`);
        break;

      case 'incoming-message':
        this.handleIncomingMessage(channelId, data).catch(e =>
          this.logger.error(`Failed to handle incoming message: ${e.message}`)
        );
        break;

      case 'error':
        this.logger.error(`CRM [${channelId}] error: ${data.error}`);
        break;
    }
  }

  /**
   * معالجة رسالة واردة من واتساب
   */
  private async handleIncomingMessage(channelId: string, data: any) {
    // البحث عن المحادثة أو إنشاءها
    let conversation = await this.prisma.crmConversation.findUnique({
      where: { customerPhone_channelId: { customerPhone: data.senderPhone, channelId } }
    });

    const isNew = !conversation;

    if (!conversation) {
      conversation = await this.prisma.crmConversation.create({
        data: {
          customerPhone: data.senderPhone,
          customerName: data.senderName || null,
          channelId,
          channelType: 'whatsapp',
          status: 'open',
        }
      });
    } else if (data.senderName && !conversation.customerName) {
      await this.prisma.crmConversation.update({
        where: { id: conversation.id },
        data: { customerName: data.senderName }
      });
    }

    // حفظ الوسائط إن وجدت
    let mediaUrl: string | null = null;
    let mediaMimeType: string | null = data.mediaMimeType || null;
    if (data.mediaBuffer) {
      const mediaResult = await this.saveMedia(channelId, data);
      if (mediaResult) {
        mediaUrl = mediaResult.url;
        mediaMimeType = mediaResult.mimeType;
      }
    }

    // إنشاء الرسالة
    const savedMessage = await this.prisma.crmMessage.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        messageType: data.messageType,
        content: data.content || null,
        mediaUrl,
        mediaFileName: data.mediaFileName || null,
        mediaMimeType,
        duration: data.duration || null,
        senderName: data.senderName || null,
        whatsappMessageId: data.messageId,
      }
    });

    // تحديث المحادثة
    const lastMessage = data.content || `[${data.messageType}]`;
    const updatedConversation = await this.prisma.crmConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage,
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
      include: { channel: { select: { id: true, name: true, phoneNumber: true } } },
    });

    // تطبيق قواعد التوزيع للمحادثات الجديدة فقط
    if (isNew) {
      await this.applyDistributionRules(conversation.id);
      // إبلاغ فوري بمحادثة جديدة
      this.gateway.notifyNewConversation(updatedConversation);
    }

    // إبلاغ فوري برسالة جديدة
    this.gateway.notifyNewMessage(conversation.id, savedMessage, updatedConversation);

    this.logger.log(`📨 CRM [${channelId}]: Incoming ${data.messageType} from ${data.senderPhone}`);
  }

  /**
   * تطبيق قواعد توزيع المحادثات
   */
  private async applyDistributionRules(conversationId: string) {
    try {
      const settings = await this.prisma.crmMessageSettings.findFirst();
      if (!settings || settings.distributionMode === 'disabled') return;

      if (settings.distributionMode === 'round_robin') {
        const crmUsers = await this.prisma.user.findMany({
          where: { hasCrmAccess: true },
          select: { id: true },
          orderBy: { id: 'asc' }
        });

        if (crmUsers.length === 0) return;

        const nextIndex = settings.roundRobinIndex % crmUsers.length;
        const assignedUser = crmUsers[nextIndex];

        await this.prisma.crmConversation.update({
          where: { id: conversationId },
          data: { assignedToId: assignedUser.id, status: 'assigned' }
        });

        await this.prisma.crmMessageSettings.update({
          where: { id: settings.id },
          data: { roundRobinIndex: settings.roundRobinIndex + 1 }
        });

        this.logger.log(`📋 Round-robin assigned conversation ${conversationId} to user ${assignedUser.id}`);
      }
      // first_claim: المستخدم يحجز المحادثة يدوياً
    } catch (error) {
      this.logger.error(`Failed to apply distribution rules: ${error.message}`);
    }
  }

  /**
   * حفظ ملف الوسائط
   */
  private async saveMedia(channelId: string, data: any): Promise<{ url: string; mimeType: string } | null> {
    try {
      const buffer = Buffer.from(data.mediaBuffer, 'base64');
      const ext = this.getMediaExtension(data.mediaMimeType, data.messageType);
      const dirPath = path.join(process.cwd(), 'uploads', 'crm-media', channelId);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const baseFileName = `${data.messageId || Date.now()}`;
      const fileName = `${baseFileName}.${ext}`;
      const filePath = path.join(dirPath, fileName);
      fs.writeFileSync(filePath, buffer);

      // تحويل الصوت OGG/Opus إلى MP3 لدعم جميع المتصفحات
      if (data.messageType === 'audio' && (ext === 'ogg' || data.mediaMimeType?.includes('opus'))) {
        const mp3Path = path.join(dirPath, `${baseFileName}.mp3`);
        const converted = this.convertAudioToMp3(filePath, mp3Path);
        if (converted) {
          try { fs.unlinkSync(filePath); } catch {} // حذف الملف الأصلي بعد التحويل
          return { url: `/uploads/crm-media/${channelId}/${baseFileName}.mp3`, mimeType: 'audio/mpeg' };
        }
      }

      return { url: `/uploads/crm-media/${channelId}/${fileName}`, mimeType: data.mediaMimeType || 'application/octet-stream' };
    } catch (error) {
      this.logger.error(`Failed to save media: ${error.message}`);
      return null;
    }
  }

  private convertAudioToMp3(inputPath: string, outputPath: string): boolean {
    const bin = ffmpegPath || 'ffmpeg';
    try {
      execFileSync(bin, [
        '-i', inputPath,
        '-codec:a', 'libmp3lame',
        '-qscale:a', '4',
        '-y',
        outputPath,
      ], { timeout: 15000, stdio: 'pipe' });
      this.logger.log(`✅ Audio converted to MP3: ${path.basename(outputPath)}`);
      return true;
    } catch (error) {
      this.logger.warn(`⚠️ Audio conversion failed (will serve OGG): ${error.message}`);
      return false;
    }
  }

  private getMediaExtension(mimeType: string | null, messageType: string): string {
    if (mimeType) {
      const mime = mimeType.split(';')[0];
      const map: Record<string, string> = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
        'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a',
        'video/mp4': 'mp4',
        'application/pdf': 'pdf',
      };
      if (map[mime]) return map[mime];
    }
    const typeMap: Record<string, string> = {
      image: 'jpg', audio: 'ogg', video: 'mp4', document: 'bin', sticker: 'webp'
    };
    return typeMap[messageType] || 'bin';
  }
}
