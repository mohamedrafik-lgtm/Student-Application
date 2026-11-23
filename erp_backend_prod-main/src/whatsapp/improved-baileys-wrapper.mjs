#!/usr/bin/env node

// Improved Baileys Wrapper with session cleanup and better error handling
import { makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrCode from 'qr-image';
import fs from 'fs';
import path from 'path';

class ImprovedBaileysWrapper {
  constructor() {
    this.socket = null;
    this.qrCodeData = null;
    this.isReady = false;
    this.isConnected = false;
    this.phoneNumber = null;
    this.authDir = './whatsapp-auth';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.connectionTimeout = null;
    this.lastError = null;
  }

  // ✅ تنظيف الجلسات الفاسدة
  async cleanupCorruptedSessions() {
    try {
      console.log('🧹 Checking for corrupted session files...');
      
      if (!fs.existsSync(this.authDir)) {
        return;
      }

      const files = fs.readdirSync(this.authDir);
      let cleanupNeeded = false;

      // فحص الملفات للبحث عن ملفات فاسدة
      for (const file of files) {
        const filePath = path.join(this.authDir, file);
        try {
          const stats = fs.statSync(filePath);
          
          // حذف الملفات الفارغة أو الصغيرة جداً
          if (stats.size === 0 || (file.endsWith('.json') && stats.size < 10)) {
            console.log(`🗑️ Removing corrupted file: ${file}`);
            fs.unlinkSync(filePath);
            cleanupNeeded = true;
          }
          
          // فحص الملفات JSON للتأكد من صحتها
          if (file.endsWith('.json')) {
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              JSON.parse(content);
            } catch (jsonError) {
              console.log(`🗑️ Removing invalid JSON file: ${file}`);
              fs.unlinkSync(filePath);
              cleanupNeeded = true;
            }
          }
        } catch (error) {
          console.log(`🗑️ Removing inaccessible file: ${file}`);
          try {
            fs.unlinkSync(filePath);
            cleanupNeeded = true;
          } catch (deleteError) {
            console.error(`Failed to delete file ${file}:`, deleteError.message);
          }
        }
      }

      if (cleanupNeeded) {
        console.log('✅ Session cleanup completed');
      }
    } catch (error) {
      console.error('❌ Session cleanup failed:', error.message);
    }
  }

  // ✅ تهيئة محسنة مع تنظيف الجلسات
  async initialize() {
    try {
      console.log('🚀 Initializing WhatsApp client...');
      
      // تنظيف الجلسات الفاسدة أولاً
      await this.cleanupCorruptedSessions();
      
      // إنشاء مجلد المصادقة إذا لم يكن موجوداً
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      // ✅ تكوين محسن للـ socket
      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'),
        defaultQueryTimeoutMs: 60 * 1000,
        connectTimeoutMs: 60 * 1000,
        keepAliveIntervalMs: 30 * 1000,
        // إضافة معالجة أفضل للأخطاء
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        markOnlineOnConnect: true,
      });

      // ✅ معالج تحديث الاتصال المحسن
      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('📱 QR Code generated');
          this.qrCodeData = await this.generateQRCodeDataURL(qr);
          this.sendMessage('qr-generated', { qrCode: this.qrCodeData });
        }

        if (connection === 'close') {
          this.isConnected = false;
          this.isReady = false;
          this.phoneNumber = null;
          
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          console.log(`📴 Connection closed. Status code: ${statusCode}`);
          
          // معالجة مختلفة حسب سبب قطع الاتصال
          if (statusCode === DisconnectReason.badSession) {
            console.log('🗑️ Bad session detected, cleaning up...');
            await this.forceCleanupSessions();
            this.sendMessage('session-corrupted', { reason: 'Bad session detected' });
          } else if (statusCode === DisconnectReason.unauthorized) {
            console.log('🚫 Unauthorized, cleaning sessions...');
            await this.forceCleanupSessions();
            this.sendMessage('unauthorized', { reason: 'Authentication failed' });
          } else if (statusCode === DisconnectReason.forbidden) {
            console.log('🚫 Forbidden, account may be banned');
            this.sendMessage('forbidden', { reason: 'Account may be banned' });
          }
          
          this.sendMessage('connection-closed', { 
            shouldReconnect, 
            statusCode,
            reason: this.getDisconnectReason(statusCode)
          });
          
          // إعادة اتصال ذكية
          if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(5000 * this.reconnectAttempts, 15000);
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => this.initialize(), delay);
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('🛑 Max reconnection attempts reached');
            this.sendMessage('max-reconnects-reached', { attempts: this.reconnectAttempts });
          }
          
        } else if (connection === 'open') {
          this.isConnected = true;
          this.isReady = true;
          this.qrCodeData = null;
          this.reconnectAttempts = 0; // إعادة تعيين عداد المحاولات
          this.lastError = null;
          
          if (this.socket?.user?.id) {
            this.phoneNumber = this.socket.user.id.split(':')[0];
            console.log(`✅ WhatsApp connected successfully. Phone: +${this.phoneNumber}`);
            this.sendMessage('connected', { phoneNumber: this.phoneNumber });
          }
        } else if (connection === 'connecting') {
          console.log('🔄 Connecting to WhatsApp...');
          this.sendMessage('connecting', {});
        }
      });

      // ✅ معالج تحديث بيانات الاعتماد المحسن
      this.socket.ev.on('creds.update', async (creds) => {
        try {
          await saveCreds();
          console.log('💾 Credentials updated and saved');
        } catch (error) {
          console.error('❌ Failed to save credentials:', error.message);
          this.lastError = error.message;
        }
      });

      // ✅ معالج الرسائل الواردة (للمراقبة)
      this.socket.ev.on('messages.upsert', (messageUpdate) => {
        // يمكن إضافة معالجة للرسائل الواردة هنا لاحقاً
        console.log(`📨 Received ${messageUpdate.messages.length} message(s)`);
      });

      // ✅ معالج أخطاء الاتصال
      this.socket.ev.on('connection.error', (error) => {
        console.error('🚨 Connection error:', error.message);
        this.lastError = error.message;
        this.sendMessage('connection-error', { error: error.message });
      });

    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      this.lastError = error.message;
      this.sendMessage('error', { error: error.message });
    }
  }

  // ✅ حذف قسري للجلسات
  async forceCleanupSessions() {
    try {
      console.log('🧹 Force cleaning all session files...');
      
      if (fs.existsSync(this.authDir)) {
        const files = fs.readdirSync(this.authDir);
        for (const file of files) {
          const filePath = path.join(this.authDir, file);
          try {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted: ${file}`);
          } catch (error) {
            console.error(`Failed to delete ${file}:`, error.message);
          }
        }
      }
      
      // إعادة إنشاء المجلد
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      }
      fs.mkdirSync(this.authDir, { recursive: true });
      
      console.log('✅ All sessions cleaned successfully');
    } catch (error) {
      console.error('❌ Force cleanup failed:', error.message);
    }
  }

  // ✅ توليد QR Code محسن
  async generateQRCodeDataURL(qr) {
    try {
      const qrCodeBuffer = qrCode.imageSync(qr, { 
        type: 'png', 
        size: 10,
        margin: 2
      });
      const base64 = qrCodeBuffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('❌ QR Code generation failed:', error.message);
      return null;
    }
  }

  // ✅ إرسال رسالة محسن مع معالجة أخطاء
  async sendWhatsAppMessage(phoneNumber, message) {
    try {
      if (!this.socket || !this.isConnected) {
        throw new Error('WhatsApp client is not ready');
      }

      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const jid = `${formattedNumber}@s.whatsapp.net`;

      console.log(`📤 Sending message to ${formattedNumber}`);
      await this.socket.sendMessage(jid, { text: message });
      
      console.log(`✅ Message sent successfully to ${formattedNumber}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send message to ${phoneNumber}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // ✅ إرسال صورة محسن
  async sendImage(phoneNumber, imagePath, caption) {
    try {
      if (!this.socket || !this.isConnected) {
        throw new Error('WhatsApp client is not ready');
      }

      // التحقق من وجود الملف
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const jid = `${formattedNumber}@s.whatsapp.net`;

      console.log(`🖼️ Sending image to ${formattedNumber}`);
      await this.socket.sendMessage(jid, {
        image: { url: imagePath },
        caption: caption
      });
      
      console.log(`✅ Image sent successfully to ${formattedNumber}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send image to ${phoneNumber}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // ✅ إرسال مستند محسن
  async sendDocument(phoneNumber, documentPath, fileName, caption) {
    try {
      if (!this.socket || !this.isConnected) {
        throw new Error('WhatsApp client is not ready');
      }

      // التحقق من وجود الملف
      if (!fs.existsSync(documentPath)) {
        throw new Error(`Document file not found: ${documentPath}`);
      }

      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const jid = `${formattedNumber}@s.whatsapp.net`;

      // تحديد نوع MIME بشكل أكثر دقة
      const mimetype = this.getMimeType(documentPath);

      console.log(`📄 Sending document to ${formattedNumber}: ${fileName}`);
      await this.socket.sendMessage(jid, {
        document: { url: documentPath },
        fileName: fileName,
        caption: caption,
        mimetype: mimetype
      });
      
      console.log(`✅ Document sent successfully to ${formattedNumber}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send document to ${phoneNumber}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // ✅ تحديد نوع MIME محسن
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // ✅ تنسيق رقم الهاتف محسن
  formatPhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');

    // معالجة الأرقام المصرية
    if (cleaned.startsWith('010') || cleaned.startsWith('011') || 
        cleaned.startsWith('012') || cleaned.startsWith('015')) {
      cleaned = '2' + cleaned;
    } else if (cleaned.startsWith('10') || cleaned.startsWith('11') || 
               cleaned.startsWith('12') || cleaned.startsWith('15')) {
      cleaned = '20' + cleaned;
    } else if (!cleaned.startsWith('2')) {
      cleaned = '2' + cleaned;
    }

    return cleaned;
  }

  // ✅ الحصول على سبب قطع الاتصال
  getDisconnectReason(statusCode) {
    const reasons = {
      [DisconnectReason.badSession]: 'Bad Session',
      [DisconnectReason.connectionClosed]: 'Connection Closed',
      [DisconnectReason.connectionLost]: 'Connection Lost',
      [DisconnectReason.connectionReplaced]: 'Connection Replaced',
      [DisconnectReason.loggedOut]: 'Logged Out',
      [DisconnectReason.restartRequired]: 'Restart Required',
      [DisconnectReason.timedOut]: 'Timed Out',
      [DisconnectReason.unauthorized]: 'Unauthorized',
      [DisconnectReason.forbidden]: 'Forbidden'
    };
    
    return reasons[statusCode] || `Unknown (${statusCode})`;
  }

  // ✅ إرسال رسالة للعملية الأب
  sendMessage(type, data) {
    const message = { 
      type, 
      data, 
      timestamp: new Date().toISOString(),
      processId: process.pid
    };
    console.log(JSON.stringify(message));
  }

  // ✅ الحصول على الحالة مع معلومات إضافية
  getStatus() {
    return {
      isReady: this.isReady,
      isConnected: this.isConnected,
      qrCode: this.qrCodeData,
      phoneNumber: this.phoneNumber,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastError: this.lastError,
      processId: process.pid
    };
  }

  // ✅ إنهاء آمن
  async gracefulShutdown() {
    try {
      console.log('👋 Graceful shutdown initiated...');
      
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
      
      if (this.socket) {
        await this.socket.logout();
        this.socket.end();
      }
      
      console.log('✅ Graceful shutdown completed');
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error.message);
    }
  }
}

// ✅ معالج رسائل العملية الأب المحسن
const wrapper = new ImprovedBaileysWrapper();

process.on('message', async (message) => {
  const { command, data } = message;
  
  try {
    switch (command) {
      case 'initialize':
        await wrapper.initialize();
        break;
        
      case 'send-message':
        const result = await wrapper.sendWhatsAppMessage(data.phoneNumber, data.message);
        process.send({ type: 'message-result', data: result });
        break;
        
      case 'send-image':
        const imageResult = await wrapper.sendImage(data.phoneNumber, data.imagePath, data.caption);
        process.send({ type: 'image-result', data: imageResult });
        break;
        
      case 'send-document':
        const documentResult = await wrapper.sendDocument(
          data.phoneNumber, 
          data.documentPath, 
          data.fileName, 
          data.caption
        );
        process.send({ type: 'document-result', data: documentResult });
        break;
        
      case 'get-status':
        const status = wrapper.getStatus();
        process.send({ type: 'status', data: status });
        break;
        
      case 'restart':
        await wrapper.gracefulShutdown();
        await wrapper.initialize();
        break;
        
      case 'cleanup-sessions':
        await wrapper.forceCleanupSessions();
        process.send({ type: 'cleanup-result', data: { success: true } });
        break;
        
      case 'shutdown':
        await wrapper.gracefulShutdown();
        process.exit(0);
        break;
        
      default:
        console.log(`❓ Unknown command: ${command}`);
        process.send({ 
          type: 'error', 
          data: { error: `Unknown command: ${command}` } 
        });
    }
  } catch (error) {
    console.error(`❌ Error handling command ${command}:`, error.message);
    process.send({ 
      type: 'command-error', 
      data: { command, error: error.message } 
    });
  }
});

// ✅ معالجة إشارات النظام للإنهاء الآمن
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  await wrapper.gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  await wrapper.gracefulShutdown();
  process.exit(0);
});

// ✅ معالجة الأخطاء غير المتوقعة
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.send({ 
    type: 'fatal-error', 
    data: { error: error.message, stack: error.stack } 
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.send({ 
    type: 'unhandled-rejection', 
    data: { reason: reason?.toString(), stack: reason?.stack } 
  });
});

// ✅ بدء التهيئة
console.log('🚀 Starting Improved Baileys Wrapper...');
wrapper.initialize();
