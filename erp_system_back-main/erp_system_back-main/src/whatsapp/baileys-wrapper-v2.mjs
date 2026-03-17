#!/usr/bin/env node

// Enhanced Baileys Wrapper with better error handling
import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrCode from 'qr-image';
import pino from 'pino';

const logger = pino({ level: 'silent' }); // Silent logger to avoid noise

class BaileysWrapperV2 {
  constructor() {
    this.socket = null;
    this.qrCodeData = null;
    this.isReady = false;
    this.isConnected = false;
    this.phoneNumber = null;
    this.authDir = './whatsapp-auth';
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing WhatsApp with Multi-File Auth...');
      
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      
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
        generateHighQualityLinkPreview: false,
        getMessage: async (key) => undefined,
        shouldIgnoreJid: jid => false,
        retryRequestDelayMs: 350,
        maxMsgRetryCount: 5,
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: undefined,
        keepAliveIntervalMs: 10_000,
        emitOwnEvents: false,
        shouldSyncHistoryMessage: () => false,
      });

      // Save credentials on update
      this.socket.ev.on('creds.update', saveCreds);

      // Connection updates
      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin } = update;
        
        console.log('📡 Connection Update:', { 
          connection, 
          hasQR: !!qr, 
          isNewLogin,
          statusCode: lastDisconnect?.error?.output?.statusCode,
          retryCount: this.retryCount
        });

        if (qr) {
          console.log('📱 QR Code received! Generating image...');
          try {
            const qrImage = qrCode.imageSync(qr, { type: 'png' });
            const qrBase64 = qrImage.toString('base64');
            this.qrCodeData = `data:image/png;base64,${qrBase64}`;
            console.log('✅ QR Code generated successfully');
            this.sendMessage('qr-generated', { qrCode: this.qrCodeData });
            this.retryCount = 0; // Reset retry count on successful QR
          } catch (err) {
            console.error('❌ Error generating QR:', err);
          }
        }

        if (connection === 'close') {
          this.isConnected = false;
          this.isReady = false;
          this.phoneNumber = null;
          
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          console.log(`🔌 Connection closed. Status: ${statusCode}, Should reconnect: ${shouldReconnect}`);
          
          this.sendMessage('connection-closed', { 
            shouldReconnect,
            statusCode,
            reason: lastDisconnect?.error?.message
          });
          
          if (statusCode === DisconnectReason.loggedOut) {
            console.log('🗑️ User logged out');
            this.sendMessage('logged-out');
          } else if (shouldReconnect && this.retryCount < this.maxRetries) {
            this.retryCount++;
            const delay = Math.min(5000 * this.retryCount, 30000); // Exponential backoff
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})...`);
            setTimeout(() => this.initialize(), delay);
          } else if (this.retryCount >= this.maxRetries) {
            console.log('❌ Max retries reached. Stopping reconnection.');
            this.sendMessage('max-retries-reached');
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp Connected successfully!');
          this.isConnected = true;
          this.isReady = true;
          this.qrCodeData = null;
          this.retryCount = 0;
          
          if (this.socket?.user?.id) {
            this.phoneNumber = this.socket.user.id.split(':')[0];
            console.log(`📱 Phone: ${this.phoneNumber}`);
          }
          
          this.sendMessage('connected', { phoneNumber: this.phoneNumber });
        } else if (connection === 'connecting') {
          console.log('🔄 Connecting to WhatsApp...');
        }
      });

      // Messages handling
      this.socket.ev.on('messages.upsert', ({ messages }) => {
        // Handle incoming messages if needed
      });

      console.log('✅ WhatsApp client initialized');

    } catch (error) {
      console.error('❌ Error initializing WhatsApp:', error);
      this.sendMessage('error', { error: error.message });
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Retrying initialization (${this.retryCount}/${this.maxRetries})...`);
        setTimeout(() => this.initialize(), 5000);
      }
    }
  }

  async sendTextMessage(jid, text) {
    if (!this.isReady) {
      throw new Error('WhatsApp not ready');
    }
    
    try {
      await this.socket.sendMessage(jid, { text });
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendDocument(jid, filePath, fileName, caption) {
    if (!this.isReady) {
      throw new Error('WhatsApp not ready');
    }
    
    try {
      const fs = await import('fs');
      await this.socket.sendMessage(jid, {
        document: fs.readFileSync(filePath),
        fileName,
        caption,
      });
      return { success: true };
    } catch (error) {
      console.error('Error sending document:', error);
      throw error;
    }
  }

  sendMessage(type, data) {
    const message = JSON.stringify({ type, data });
    if (process.send) {
      process.send({ type, data });
    } else {
      console.log(message);
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isConnected: this.isConnected,
      phoneNumber: this.phoneNumber,
      qrCode: this.qrCodeData,
    };
  }

  async logout() {
    try {
      await this.socket?.logout();
      this.isReady = false;
      this.isConnected = false;
      this.qrCodeData = null;
      this.phoneNumber = null;
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
}

// Start the wrapper
const wrapper = new BaileysWrapperV2();
wrapper.initialize();

// Handle messages from parent process
process.on('message', async (message) => {
  console.log('📥 Received command:', message.command);
  
  try {
    switch (message.command) {
      case 'send-message':
        const result = await wrapper.sendTextMessage(message.jid, message.text);
        wrapper.sendMessage('message-sent', result);
        break;
        
      case 'send-document':
        const docResult = await wrapper.sendDocument(
          message.jid,
          message.filePath,
          message.fileName,
          message.caption
        );
        wrapper.sendMessage('document-sent', docResult);
        break;
        
      case 'get-status':
        wrapper.sendMessage('status', wrapper.getStatus());
        break;
        
      case 'logout':
        await wrapper.logout();
        wrapper.sendMessage('logged-out', { success: true });
        break;
        
      case 'restart':
        await wrapper.logout();
        setTimeout(() => wrapper.initialize(), 2000);
        break;
    }
  } catch (error) {
    wrapper.sendMessage('error', { error: error.message });
  }
});

// Handle cleanup
process.on('SIGTERM', async () => {
  console.log('⏹️ SIGTERM received, cleaning up...');
  await wrapper.logout();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⏹️ SIGINT received, cleaning up...');
  await wrapper.logout();
  process.exit(0);
});

export default BaileysWrapperV2;

