#!/usr/bin/env node

// CRM WhatsApp Baileys Wrapper - منفصل تماماً عن واتساب اللوحة الإدارية
// يحفظ الجلسات في جداول CRM المنفصلة
import { makeWASocket, DisconnectReason, initAuthCreds, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadMediaMessage } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrCode from 'qr-image';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const logger = pino({ level: 'silent' });

// CRM Database Auth State - يستخدم جداول CRM المنفصلة
const useCrmDatabaseAuthState = async (prisma, channelId) => {
  
  const existingSessions = await prisma.crmWhatsAppSession.count({
    where: { channelId }
  });
  console.log(`🗄️ CRM Sessions for channel ${channelId}: ${existingSessions}`);
  
  const readData = async (key) => {
    try {
      const session = await prisma.crmWhatsAppSession.findUnique({
        where: { channelId_key: { channelId, key } }
      });
      
      if (session?.data) {
        const parsed = JSON.parse(session.data, (k, value) => {
          if (value && value.type === 'Buffer' && typeof value.data === 'string') {
            return Buffer.from(value.data, 'base64');
          }
          return value;
        });
        return parsed;
      }
      return null;
    } catch (error) {
      console.error(`❌ CRM: Error reading session key ${key}:`, error.message);
      return null;
    }
  };

  const writeData = async (key, data) => {
    try {
      const processedData = JSON.stringify(data, (k, value) => {
        if (value instanceof Buffer) {
          return { type: 'Buffer', data: value.toString('base64') };
        } else if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
          return { type: 'Buffer', data: Buffer.from(value.data).toString('base64') };
        }
        return value;
      });
      
      await prisma.crmWhatsAppSession.upsert({
        where: { channelId_key: { channelId, key } },
        create: { channelId, key, data: processedData },
        update: { data: processedData }
      });
    } catch (error) {
      console.error(`❌ CRM: Error writing session key ${key}:`, error.message);
      throw error;
    }
  };

  const removeData = async (key) => {
    try {
      await prisma.crmWhatsAppSession.delete({
        where: { channelId_key: { channelId, key } }
      }).catch(() => {});
    } catch (error) {
      // تجاهل
    }
  };

  let creds = await readData('creds') || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          for (const id of ids) {
            const key = `${type}-${id}`;
            const value = await readData(key);
            if (value) data[id] = value;
          }
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      await writeData('creds', creds);
    },
    clearAll: async () => {
      await prisma.crmWhatsAppSession.deleteMany({ where: { channelId } });
      creds = initAuthCreds();
      console.log(`✅ CRM: All sessions cleared for channel ${channelId}`);
    }
  };
};

class CrmBaileysWrapper {
  constructor(channelId) {
    this.channelId = channelId;
    this.socket = null;
    this.isReady = false;
    this.isConnected = false;
    this.phoneNumber = null;
    this.prisma = new PrismaClient();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.pairCode = null;
    // مخزن الرسائل المرسلة لإعادة المحاولة (getMessage callback)
    this.sentMessages = new Map();
  }

  async initialize(usePairCode = false, phoneNumberForPairing = null) {
    try {
      console.log(`🚀 CRM: Initializing WhatsApp for channel ${this.channelId}...`);
      
      const { state, saveCreds, clearAll } = await useCrmDatabaseAuthState(this.prisma, this.channelId);
      this.clearAllSessions = clearAll;

      const { version } = await fetchLatestBaileysVersion();

      const socketOptions = {
        version,
        logger,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false,
        markOnlineOnConnect: false,
        fireInitQueries: true,
        emitOwnEvents: false,
        generateHighQualityLinkPreview: false,
        shouldIgnoreJid: jid => false,
        retryRequestDelayMs: 350,
        maxMsgRetryCount: 5,
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: undefined,
        keepAliveIntervalMs: 10_000,
        shouldSyncHistoryMessage: () => false,
        getMessage: async (key) => {
          const msg = this.sentMessages.get(key.id);
          return msg || undefined;
        },
      };

      // إذا كان الاتصال عبر pair code، لا نطلب QR
      if (usePairCode && phoneNumberForPairing) {
        socketOptions.printQRInTerminal = false;
      }

      this.socket = makeWASocket(socketOptions);

      this.socket.ev.on('creds.update', saveCreds);

      // إذا كان pair code مطلوب، نطلبه بعد إنشاء الـ socket
      if (usePairCode && phoneNumberForPairing) {
        try {
          // انتظر قليلاً حتى يتم فتح الاتصال
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          if (this.socket.requestPairingCode) {
            const code = await this.socket.requestPairingCode(phoneNumberForPairing);
            this.pairCode = code;
            console.log(`📱 CRM: Pair code generated: ${code}`);
            this.sendMessage('pair-code', { pairCode: code });
          } else {
            console.error('❌ CRM: requestPairingCode not available');
            this.sendMessage('error', { error: 'Pair code not supported in this Baileys version' });
          }
        } catch (error) {
          console.error('❌ CRM: Failed to request pair code:', error.message);
          this.sendMessage('error', { error: `Failed to request pair code: ${error.message}` });
        }
      }

      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr && !usePairCode) {
          const qrImage = qrCode.imageSync(qr, { type: 'png' });
          const qrBase64 = qrImage.toString('base64');
          this.sendMessage('qr', { qrCode: `data:image/png;base64,${qrBase64}` });
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = (lastDisconnect?.error instanceof Boom) 
            ? statusCode !== DisconnectReason.loggedOut
            : true;
          
          this.isConnected = false;
          this.isReady = false;
          
          if (statusCode === DisconnectReason.loggedOut) {
            await this.clearAllSessions();
            this.sendMessage('logged-out', { reason: 'User logged out' });
            
            // تحديث حالة القناة
            await this.prisma.crmWhatsAppChannel.update({
              where: { id: this.channelId },
              data: { status: 'disconnected', phoneNumber: null, disconnectedAt: new Date() }
            });
          } else if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 CRM: Reconnecting channel ${this.channelId}... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.initialize(), 5000);
          }
          
          this.sendMessage('disconnected', { shouldReconnect, statusCode });
        } else if (connection === 'open') {
          this.isConnected = true;
          this.isReady = true;
          this.reconnectAttempts = 0;
          this.phoneNumber = this.socket.user?.id.split(':')[0];
          
          console.log(`✅ CRM: Channel ${this.channelId} connected! Phone: ${this.phoneNumber}`);
          
          try {
            await saveCreds();
          } catch (error) {
            console.error('❌ CRM: Failed to save credentials:', error.message);
          }

          // تحديث حالة القناة في قاعدة البيانات
          await this.prisma.crmWhatsAppChannel.update({
            where: { id: this.channelId },
            data: { 
              status: 'connected', 
              phoneNumber: this.phoneNumber,
              connectedAt: new Date() 
            }
          });
          
          this.sendMessage('ready', { phoneNumber: this.phoneNumber });
        } else if (connection === 'connecting') {
          this.sendMessage('connecting', {});
        }
      });

      this.socket.ev.on('creds.update', async () => {
        try { await saveCreds(); } catch (error) { /* تجاهل */ }
      });

      // استقبال الرسائل الواردة
      this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        for (const msg of messages) {
          if (msg.key.fromMe) continue;
          
          const remoteJid = msg.key.remoteJid;
          if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('@broadcast') || remoteJid.includes('@newsletter')) continue;
          
          // حفظ الرقم مع لاحقة JID لضمان الرد الصحيح
          // مثال: 201012345678@s.whatsapp.net → 201012345678
          // مثال: 111214118080619@lid → 111214118080619@lid
          const senderPhone = remoteJid.endsWith('@lid') 
            ? remoteJid 
            : remoteJid.replace('@s.whatsapp.net', '');
          const senderName = msg.pushName || '';
          const messageId = msg.key.id;
          
          let messageType = 'text';
          let content = '';
          let mediaBuffer = null;
          let mediaFileName = null;
          let mediaMimeType = null;
          let duration = null;
          
          const msgContent = msg.message;
          if (!msgContent) continue;
          
          try {
            if (msgContent.conversation) {
              content = msgContent.conversation;
            } else if (msgContent.extendedTextMessage) {
              content = msgContent.extendedTextMessage.text || '';
            } else if (msgContent.imageMessage) {
              messageType = 'image';
              content = msgContent.imageMessage.caption || '';
              mediaMimeType = msgContent.imageMessage.mimetype;
              try { mediaBuffer = await downloadMediaMessage(msg, 'buffer', {}); } catch (e) { console.error('Media download failed:', e.message); }
            } else if (msgContent.audioMessage) {
              messageType = 'audio';
              duration = msgContent.audioMessage.seconds || null;
              mediaMimeType = msgContent.audioMessage.mimetype;
              try { mediaBuffer = await downloadMediaMessage(msg, 'buffer', {}); } catch (e) { console.error('Media download failed:', e.message); }
            } else if (msgContent.videoMessage) {
              messageType = 'video';
              content = msgContent.videoMessage.caption || '';
              duration = msgContent.videoMessage.seconds || null;
              mediaMimeType = msgContent.videoMessage.mimetype;
              try { mediaBuffer = await downloadMediaMessage(msg, 'buffer', {}); } catch (e) { console.error('Media download failed:', e.message); }
            } else if (msgContent.documentMessage) {
              messageType = 'document';
              content = msgContent.documentMessage.caption || '';
              mediaFileName = msgContent.documentMessage.fileName || 'document';
              mediaMimeType = msgContent.documentMessage.mimetype;
              try { mediaBuffer = await downloadMediaMessage(msg, 'buffer', {}); } catch (e) { console.error('Media download failed:', e.message); }
            } else if (msgContent.stickerMessage) {
              messageType = 'sticker';
              mediaMimeType = msgContent.stickerMessage.mimetype;
              try { mediaBuffer = await downloadMediaMessage(msg, 'buffer', {}); } catch (e) { console.error('Media download failed:', e.message); }
            } else {
              continue; // نوع رسالة غير مدعوم
            }
            
            this.sendMessage('incoming-message', {
              senderPhone,
              senderName,
              messageId,
              messageType,
              content,
              mediaBuffer: mediaBuffer ? mediaBuffer.toString('base64') : null,
              mediaFileName,
              mediaMimeType,
              duration,
              timestamp: msg.messageTimestamp,
            });
          } catch (error) {
            console.error('Error processing incoming message:', error.message);
          }
        }
      });

    } catch (error) {
      console.error(`❌ CRM: Initialization failed for channel ${this.channelId}:`, error.message);
      this.sendMessage('error', { error: error.message });
    }
  }

  formatPhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');
    // إذا كان الرقم بصيغة دولية كاملة (10+ أرقام وبادئة بلد) اتركه كما هو
    if (cleaned.length >= 10 && (
      cleaned.startsWith('20') || // مصر
      cleaned.startsWith('966') || // السعودية
      cleaned.startsWith('971') || // الإمارات
      cleaned.startsWith('962') || // الأردن
      cleaned.startsWith('964') || // العراق
      cleaned.startsWith('961') || // لبنان
      cleaned.startsWith('212') || // المغرب
      cleaned.startsWith('216') || // تونس
      cleaned.startsWith('218') || // ليبيا
      cleaned.startsWith('249') || // السودان
      cleaned.startsWith('968') || // عمان
      cleaned.startsWith('965') || // الكويت
      cleaned.startsWith('973') || // البحرين
      cleaned.startsWith('974') || // قطر
      cleaned.startsWith('1')   // أمريكا/كندا
    )) {
      return cleaned;
    }
    // أرقام مصرية محلية
    if (cleaned.startsWith('010') || cleaned.startsWith('011') || 
        cleaned.startsWith('012') || cleaned.startsWith('015')) {
      cleaned = '2' + cleaned;
    } else if (cleaned.startsWith('10') || cleaned.startsWith('11') || 
               cleaned.startsWith('12') || cleaned.startsWith('15')) {
      cleaned = '20' + cleaned;
    }
    console.log(`📞 CRM: formatPhoneNumber: '${phoneNumber}' → '${cleaned}')`);
    return cleaned;
  }

  async sendWhatsAppMessage(to, message) {
    try {
      if (!this.socket || !this.isConnected) {
        throw new Error('WhatsApp not connected');
      }
      
      let formattedNumber;
      if (to.endsWith('@lid')) {
        formattedNumber = to;
      } else if (to.includes('@s.whatsapp.net')) {
        formattedNumber = to;
      } else {
        const cleanedNumber = this.formatPhoneNumber(to);
        formattedNumber = `${cleanedNumber}@s.whatsapp.net`;
      }
      
      console.log(`📤 CRM: Sending message to ${formattedNumber} (original: ${to})`);
      
      const result = await this.socket.sendMessage(formattedNumber, { text: message });
      
      if (result?.key?.id) {
        this.sentMessages.set(result.key.id, { conversation: message });
        if (this.sentMessages.size > 100) {
          const firstKey = this.sentMessages.keys().next().value;
          this.sentMessages.delete(firstKey);
        }
      }
      
      console.log(`✅ CRM: Message sent successfully. Key: ${result?.key?.id}, Status: ${result?.status}`);
      return { success: true, messageKey: result?.key?.id };
    } catch (error) {
      console.error(`❌ CRM: Failed to send message to ${to}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * إرسال رسالة ميديا (صورة / صوت)
   * @param {string} to - رقم المرسل إليه
   * @param {string} type - 'image' | 'audio'
   * @param {Buffer|string} mediaBuffer - Buffer أو base64
   * @param {string} mimetype - نوع الملف
   * @param {string} caption - التعليق (للصور فقط)
   */
  async sendMediaMessage(to, type, mediaBase64, mimetype, caption) {
    try {
      if (!this.socket || !this.isConnected) {
        throw new Error('WhatsApp not connected');
      }
      
      let formattedNumber;
      if (to.endsWith('@lid')) {
        formattedNumber = to;
      } else if (to.includes('@s.whatsapp.net')) {
        formattedNumber = to;
      } else {
        const cleanedNumber = this.formatPhoneNumber(to);
        formattedNumber = `${cleanedNumber}@s.whatsapp.net`;
      }
      
      const mediaBuffer = Buffer.from(mediaBase64, 'base64');
      let msgContent;
      
      if (type === 'image') {
        msgContent = { image: mediaBuffer, mimetype: mimetype || 'image/jpeg', caption: caption || undefined };
      } else if (type === 'audio') {
        msgContent = { audio: mediaBuffer, mimetype: mimetype || 'audio/mp4', ptt: true };
      } else {
        throw new Error(`Unsupported media type: ${type}`);
      }
      
      console.log(`📤 CRM: Sending ${type} to ${formattedNumber} (${mediaBuffer.length} bytes)`);
      
      const result = await this.socket.sendMessage(formattedNumber, msgContent);
      
      console.log(`✅ CRM: ${type} sent successfully. Key: ${result?.key?.id}`);
      return { success: true, messageKey: result?.key?.id };
    } catch (error) {
      console.error(`❌ CRM: Failed to send ${type} to ${to}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getStatus() {
    return {
      isReady: this.isReady,
      isConnected: this.isConnected,
      phoneNumber: this.phoneNumber
    };
  }

  async clearSessions() {
    try {
      if (this.clearAllSessions) await this.clearAllSessions();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async gracefulShutdown() {
    try {
      if (this.socket) {
        try { this.socket.end(); } catch (e) { /* تجاهل */ }
      }
      await this.prisma.$disconnect();
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ type, data });
    }
  }
}

// Main - يستقبل channelId من parent process
let wrapper = null;

process.on('message', async (message) => {
  const { command, data } = message;
  
  try {
    switch (command) {
      case 'initialize':
        wrapper = new CrmBaileysWrapper(data.channelId);
        await wrapper.initialize(data.usePairCode, data.phoneNumber);
        break;
        
      case 'send-message':
        if (!wrapper) throw new Error('Wrapper not initialized');
        const messageResult = await wrapper.sendWhatsAppMessage(data.phoneNumber, data.message);
        process.send({ type: 'message-result', data: messageResult });
        break;

      case 'send-media':
        if (!wrapper) throw new Error('Wrapper not initialized');
        const mediaResult = await wrapper.sendMediaMessage(
          data.phoneNumber, data.mediaType, data.mediaBase64, data.mimetype, data.caption
        );
        process.send({ type: 'message-result', data: mediaResult });
        break;
        
      case 'get-status':
        if (!wrapper) {
          process.send({ type: 'status-result', data: { isReady: false, isConnected: false } });
        } else {
          const status = await wrapper.getStatus();
          process.send({ type: 'status-result', data: status });
        }
        break;

      case 'clear-sessions':
        if (wrapper) {
          const clearResult = await wrapper.clearSessions();
          process.send({ type: 'clear-result', data: clearResult });
        }
        break;
        
      case 'shutdown':
        if (wrapper) await wrapper.gracefulShutdown();
        else process.exit(0);
        break;
    }
  } catch (error) {
    console.error('CRM command error:', error.message);
    process.send({ type: 'error', data: { error: error.message } });
  }
});

process.on('SIGTERM', () => wrapper?.gracefulShutdown());
process.on('SIGINT', () => wrapper?.gracefulShutdown());

console.log('🎯 CRM WhatsApp wrapper process ready');
