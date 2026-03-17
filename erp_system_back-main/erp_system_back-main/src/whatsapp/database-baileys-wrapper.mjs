#!/usr/bin/env node

// Database-based Baileys Wrapper - يحفظ الجلسات في قاعدة البيانات
import { makeWASocket, DisconnectReason, initAuthCreds, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrCode from 'qr-image';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const logger = pino({ level: 'silent' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database Auth State Implementation
const useDatabaseAuthState = async (prisma) => {
  
  // تحقق من وجود جلسات موجودة
  const existingSessions = await prisma.whatsAppSession.count();
  console.log(`🗄️ Existing sessions in database: ${existingSessions}`);
  
  const readData = async (key) => {
    try {
      const session = await prisma.whatsAppSession.findUnique({
        where: { key }
      });
      
      if (session?.data) {
        console.log(`📖 Loading session key: ${key} (${session.data.length} bytes)`);
        
        // معالجة Buffers عند القراءة
        const parsed = JSON.parse(session.data, (key, value) => {
          if (value && value.type === 'Buffer' && typeof value.data === 'string') {
            return Buffer.from(value.data, 'base64');
          }
          return value;
        });
        
        console.log(`✅ Session key loaded: ${key}`);
        return parsed;
      } else {
        console.log(`⚠️ Session key not found: ${key}`);
      }
      return null;
    } catch (error) {
      console.error(`❌ Error reading session key ${key}:`, error);
      return null;
    }
  };

  const writeData = async (key, data) => {
    try {
      // معالجة Buffers عند الحفظ
      const processedData = JSON.stringify(data, (key, value) => {
        if (value instanceof Buffer) {
          // Buffer object من Node.js
          return {
            type: 'Buffer',
            data: value.toString('base64')
          };
        } else if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
          // Buffer في صيغة JSON القديمة { type: 'Buffer', data: [1, 2, 3] }
          return {
            type: 'Buffer',
            data: Buffer.from(value.data).toString('base64')
          };
        }
        return value;
      });
      
      console.log(`💾 Saving session key: ${key} (${processedData.length} bytes)`);
      
      await prisma.whatsAppSession.upsert({
        where: { key },
        create: {
          key,
          data: processedData
        },
        update: {
          data: processedData
        }
      });
      
      console.log(`✅ Session key saved: ${key}`);
    } catch (error) {
      console.error(`❌ Error writing session key ${key}:`, error);
      throw error;
    }
  };

  const removeData = async (key) => {
    try {
      await prisma.whatsAppSession.delete({
        where: { key }
      }).catch(() => {});
    } catch (error) {
      console.error(`Error removing session key ${key}:`, error);
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
            if (value) {
              data[id] = value;
            }
          }
          
          return data;
        },
        
        set: async (data) => {
          const tasks = [];
          
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              
              if (value) {
                tasks.push(writeData(key, value));
              } else {
                tasks.push(removeData(key));
              }
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
      await prisma.whatsAppSession.deleteMany({});
      creds = initAuthCreds(); // إعادة تهيئة credentials لإجبار QR code
      console.log('✅ All sessions cleared from database');
    }
  };
};

class DatabaseBaileysWrapper {
  constructor() {
    this.socket = null;
    this.isReady = false;
    this.isConnected = false;
    this.phoneNumber = null;
    this.prisma = new PrismaClient();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing WhatsApp with Database Auth State...');
      
      const { state, saveCreds, clearAll } = await useDatabaseAuthState(this.prisma);
      this.clearAllSessions = clearAll;

      // Fetch latest Baileys version for better compatibility
      const { version } = await fetchLatestBaileysVersion();
      console.log(`📦 Using Baileys version: ${version.join('.')}`);

      this.socket = makeWASocket({
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
          return undefined;
        },
      });

      // Save credentials on update
      this.socket.ev.on('creds.update', saveCreds);

      // Connection updates
      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        console.log('📡 Connection Update:', { connection, hasQR: !!qr, statusCode: lastDisconnect?.error?.output?.statusCode });
        
        if (qr) {
          console.log('📱 QR Code received! Generating image...');
          const qrImage = qrCode.imageSync(qr, { type: 'png' });
          const qrBase64 = qrImage.toString('base64');
          console.log('✅ QR Code image generated, length:', qrBase64.length);
          this.sendMessage('qr', { qrCode: `data:image/png;base64,${qrBase64}` });
          console.log('📤 QR Code sent to parent process');
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error instanceof Boom) 
            ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
            : true;
          
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          
          console.log('🔌 Connection closed:', statusCode);
          this.isConnected = false;
          this.isReady = false;
          
          // ⚠️ احذف الجلسة فقط عند تسجيل خروج صريح
          // لا تحذف عند 401 أو 403 لأنها قد تكون أخطاء مؤقتة
          if (statusCode === DisconnectReason.loggedOut) {
            console.log('🗑️ User logged out, clearing database...');
            await this.clearAllSessions();
            this.sendMessage('logged-out', { reason: 'User logged out from WhatsApp' });
          } else if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) [statusCode: ${statusCode}]`);
            setTimeout(() => this.initialize(), 5000);
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ Max reconnection attempts reached. Stopping reconnection.');
            this.sendMessage('max-reconnect-reached', { statusCode });
          }
          
          this.sendMessage('disconnected', { 
            shouldReconnect,
            statusCode,
            reason: lastDisconnect?.error?.message 
          });
        } else if (connection === 'open') {
          console.log('✅ WhatsApp Connected!');
          this.isConnected = true;
          this.isReady = true;
          this.reconnectAttempts = 0;
          this.phoneNumber = this.socket.user?.id.split(':')[0];
          
          console.log(`📱 Phone: ${this.phoneNumber}`);
          console.log(`📊 Status: Connected=${this.isConnected}, Ready=${this.isReady}`);
          
          // حفظ الـ credentials فوراً بعد الاتصال الناجح
          try {
            console.log('💾 Saving credentials after successful connection...');
            await saveCreds();
            console.log('✅ Credentials saved successfully!');
          } catch (error) {
            console.error('❌ Failed to save credentials:', error);
          }
          
          console.log('📤 Sending ready message to parent...');
          
          this.sendMessage('ready', { 
            phoneNumber: this.phoneNumber,
            user: this.socket.user 
          });
          
          console.log('✅ Ready message sent!');
        } else if (connection === 'connecting') {
          console.log('🔄 Connecting to WhatsApp...');
          this.sendMessage('connecting', {});
        }
      });

      // Credentials update - حفظ تلقائي عند أي تحديث
      this.socket.ev.on('creds.update', async () => {
        console.log('🔄 Credentials updated, saving...');
        try {
          await saveCreds();
          console.log('✅ Credentials auto-saved!');
        } catch (error) {
          console.error('❌ Failed to auto-save credentials:', error);
        }
      });

      console.log('✅ Database WhatsApp wrapper initialized');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      this.sendMessage('error', { error: error.message });
    }
  }

  formatPhoneNumber(phoneNumber) {
    // إزالة جميع الرموز غير الرقمية
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

  async sendWhatsAppMessage(to, message) {
    try {
      console.log(`📤 Send message request - isConnected: ${this.isConnected}, hasSocket: ${!!this.socket}`);
      
      if (!this.socket || !this.isConnected) {
        const error = `WhatsApp not connected (socket: ${!!this.socket}, connected: ${this.isConnected})`;
        console.error(`❌ ${error}`);
        throw new Error(error);
      }

      // تنسيق رقم الهاتف تلقائياً
      const cleanedNumber = this.formatPhoneNumber(to);
      const formattedNumber = cleanedNumber.includes('@s.whatsapp.net') 
        ? cleanedNumber 
        : `${cleanedNumber}@s.whatsapp.net`;
      
      console.log(`📱 Sending to: ${formattedNumber} (original: ${to})`);
      
      await this.socket.sendMessage(formattedNumber, { text: message });
      console.log('✅ Message sent successfully via Baileys');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Send message error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendDocument(phoneNumber, documentPath, fileName, caption) {
    try {
      if (!this.socket || !this.isConnected) {
        throw new Error('WhatsApp not connected');
      }

      // تنسيق رقم الهاتف تلقائياً
      const cleanedNumber = this.formatPhoneNumber(phoneNumber);
      const formattedNumber = cleanedNumber.includes('@s.whatsapp.net') 
        ? cleanedNumber 
        : `${cleanedNumber}@s.whatsapp.net`;
      
      await this.socket.sendMessage(formattedNumber, {
        document: { url: documentPath },
        fileName: fileName,
        caption: caption || '',
        mimetype: 'application/pdf'
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Send document error:', error);
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
      if (this.clearAllSessions) {
        await this.clearAllSessions();
        console.log('✅ All database sessions cleared');
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Clear sessions error:', error);
      return { success: false, error: error.message };
    }
  }

  async gracefulShutdown() {
    try {
      console.log('🛑 Shutting down Database WhatsApp wrapper...');
      
      // ⚠️ لا تستدعي logout عند الـ shutdown - فقط أغلق الـ socket
      // logout() يحذف الجلسات من قاعدة البيانات!
      if (this.socket) {
        try {
          // فقط أغلق الـ WebSocket بدون حذف الجلسات
          this.socket.end();
          console.log('✅ Socket closed (sessions preserved)');
        } catch (error) {
          console.log('⚠️ Socket already closed');
        }
      }
      
      await this.prisma.$disconnect();
      console.log('✅ Database connection closed');
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Shutdown error:', error);
      process.exit(1);
    }
  }

  sendMessage(type, data) {
    if (process.send) {
      process.send({ type, data });
    }
  }
}

// Main
const wrapper = new DatabaseBaileysWrapper();

process.on('message', async (message) => {
  const { command, data } = message;
  
  console.log(`📥 Received command: ${command}`, data ? `(phone: ${data.phoneNumber})` : '');
  
  try {
    switch (command) {
      case 'initialize':
        await wrapper.initialize();
        break;
        
      case 'send-message':
        console.log('🔄 Processing send-message command...');
        const messageResult = await wrapper.sendWhatsAppMessage(data.phoneNumber, data.message);
        console.log('📤 Sending result back:', messageResult);
        process.send({ type: 'message-result', data: messageResult });
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
        const status = await wrapper.getStatus();
        process.send({ type: 'status-result', data: status });
        break;

      case 'clear-sessions':
        const clearResult = await wrapper.clearSessions();
        process.send({ type: 'clear-result', data: clearResult });
        break;
        
      case 'shutdown':
        await wrapper.gracefulShutdown();
        break;
    }
  } catch (error) {
    console.error('Command error:', error);
    process.send({ type: 'error', data: { error: error.message } });
  }
});

process.on('SIGTERM', () => wrapper.gracefulShutdown());
process.on('SIGINT', () => wrapper.gracefulShutdown());

console.log('🎯 Database WhatsApp wrapper process ready');
